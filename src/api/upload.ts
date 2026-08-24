/**
 * upload.ts — 촬영본 업로드 (명세 9.2)
 *
 * ⚠️ fetch 를 쓰지 않는 이유
 *
 * fetch 는 업로드 진행률을 알려주지 않습니다. 요청을 보내고 끝날 때까지
 * 아무 신호가 없어서, 화면에는 "10%" 같은 가짜 값을 띄우고 멈춘 것처럼 보입니다.
 *
 * 사장님은 가게에서 신호가 약한 곳에 있을 수 있습니다. 30초짜리 영상이
 * 1분 넘게 올라가는 동안 진행률이 안 움직이면 앱이 죽었다고 판단하고 꺼버립니다.
 * 그 순간 촬영본이 날아갑니다.
 *
 * expo-file-system 의 UploadTask 는 실제 전송 바이트를 알려주고
 * 취소도 됩니다. 그래서 이걸 씁니다.
 */
import { File, UploadTask, UploadType } from 'expo-file-system';
import { API } from './endpoints';
import { BASE_URL, ApiError, isMocked } from './http';
import { mockRequest } from './mock/server';
import { toCamel } from './schema/convert';
import { getTokens } from '../lib/session';
import type { FootageResponse } from './schema/types';

export interface UploadHandle {
  /** 완료를 기다립니다. */
  promise: Promise<FootageResponse>;
  /** 사장님이 취소를 누르면 호출합니다. */
  cancel: () => void;
}

interface UploadInput {
  taskId: number;
  uri: string;
  durationSec: number;
  /** 0~1. 실제 전송 바이트 기준입니다. */
  onProgress?: (ratio: number) => void;
}

/**
 * Mock 모드에서도 진행률이 자연스럽게 올라가야 UI 를 검증할 수 있습니다.
 * 실제 업로드와 같은 모양의 handle 을 돌려줍니다.
 */
function mockUpload({ taskId, durationSec, onProgress }: UploadInput): UploadHandle {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const promise = new Promise<FootageResponse>((resolve, reject) => {
    let ratio = 0;
    timer = setInterval(() => {
      if (cancelled) {
        if (timer) clearInterval(timer);
        reject(new ApiError(0, 'UPLOAD_FAILED', '사용자가 취소했습니다'));
        return;
      }
      ratio = Math.min(1, ratio + 0.08);
      onProgress?.(ratio);
      if (ratio >= 1) {
        if (timer) clearInterval(timer);
        /**
         * ⚠️ 반드시 mock 서버를 실제로 호출합니다 (2026-08-24 실기기 무한반복의 원인).
         *
         * 이전 코드는 여기서 가짜 응답만 만들어 돌려줬습니다. 업로드가 "성공"해도
         * mock 서버의 태스크 상태는 미완료 그대로라서, 목록을 다시 읽는 순간
         * 같은 태스크(간판 촬영)가 또 "다음 할 일"로 나왔습니다. 몇 번을 찍어도
         * 제자리 — 무한반복. "저장은 상태를 실제로 바꿔야 한다"는 이 프로젝트
         * 제1규칙을 mock 업로드 자신이 어기고 있었던 겁니다.
         * (컨테이너 검증이 이걸 못 잡은 이유: 테스트가 서버 함수를 직접 불러서
         *  이 우회 경로를 안 탔습니다. 이제 테스트도 이 함수를 태웁니다.)
         */
        mockRequest(API.taskFootage(taskId), 'POST', {
          footage_type: 'VIDEO',
          footage_duration_sec: Math.round(durationSec),
        })
          .then((res) => resolve(toCamel(res) as unknown as FootageResponse))
          .catch(reject);
      }
    }, 120);
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    },
  };
}

export function uploadFootage(input: UploadInput): UploadHandle {
  const path = API.taskFootage(input.taskId);

  if (isMocked(path)) {
    return mockUpload(input);
  }

  const { taskId, uri, durationSec, onProgress } = input;
  let task: UploadTask | null = null;

  const promise = (async (): Promise<FootageResponse> => {
    const tokens = await getTokens();

    const file = new File(uri);
    if (!file.exists) {
      throw new ApiError(0, 'UPLOAD_FAILED', '촬영본 파일을 찾을 수 없습니다');
    }

    task = new UploadTask(file, `${BASE_URL}${path}`, {
      httpMethod: 'POST',
      // 명세 9.2 는 multipart/form-data 입니다.
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'video/mp4',
      // 명세 body 의 나머지 필드. snake_case 로 보냅니다.
      parameters: {
        footage_type: 'VIDEO',
        footage_duration_sec: String(Math.round(durationSec)),
      },
      headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      onProgress: ({ bytesSent, totalBytes }) => {
        // totalBytes 가 -1 이면 서버가 길이를 모르는 경우입니다.
        if (totalBytes > 0) onProgress?.(Math.min(1, bytesSent / totalBytes));
      },
    });

    let result;
    try {
      result = await task.uploadAsync();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Abort')) throw new ApiError(0, 'UPLOAD_FAILED', '취소됨');
      throw new ApiError(0, 'NETWORK_ERROR', msg);
    } finally {
      task?.release();
    }

    if (result.status < 200 || result.status >= 300) {
      let code = 'UPLOAD_FAILED';
      try {
        code = JSON.parse(result.body)?.error_code ?? code;
      } catch {
        // 본문이 JSON 이 아니면 기본 코드를 씁니다
      }
      // 413 은 파일이 큰 경우입니다. 사장님에게 "더 짧게 찍으세요"로 안내됩니다.
      if (result.status === 413) code = 'FILE_TOO_LARGE';
      throw new ApiError(result.status, code);
    }

    onProgress?.(1);
    return toCamel<FootageResponse>(JSON.parse(result.body));
  })();

  return {
    promise,
    cancel: () => task?.cancel(),
  };
}
