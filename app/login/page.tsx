'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/app/actions/auth';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

type AuthAction = typeof signInWithEmail;

function SubmitButton({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-2.5 px-4 rounded-lg bg-[#8B735B] hover:bg-[#7A654D]
        text-white text-sm font-semibold tracking-wide
        transition-colors duration-200 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? '处理中...' : label}
    </button>
  );
}

function EmailForm({
  action,
  buttonLabel,
  errorFromUrl,
}: {
  action: AuthAction;
  buttonLabel: string;
  errorFromUrl?: string;
}) {
  const [state, isPending] = useActionState(action, null);
  const [showPassword, setShowPassword] = useState(false);

  // 优先显示 URL 参数中的错误，其次显示 action 返回的错误
  const displayError = errorFromUrl ?? state?.error;

  return (
    <form action={action} className="space-y-3">
      {displayError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200
          rounded-md px-3 py-2 text-center">
          {displayError}
        </p>
      )}

      <div>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="邮箱地址"
          autoComplete="email"
          className="w-full px-4 py-2.5 rounded-lg
            bg-[#E5E1DA] text-[#111111] text-sm
            placeholder:text-[#999999]
            focus:outline-none focus:ring-2 focus:ring-[#8B735B]/30
            transition-all duration-200"
        />
      </div>

      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
          placeholder="密码"
          autoComplete="current-password"
          className="w-full px-4 py-2.5 pr-10 rounded-lg
            bg-[#E5E1DA] text-[#111111] text-sm
            placeholder:text-[#999999]
            focus:outline-none focus:ring-2 focus:ring-[#8B735B]/30
            transition-all duration-200"
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2
            text-[#999999] hover:text-[#8B735B] transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      <SubmitButton pending={isPending} label={buttonLabel} />
    </form>
  );
}

async function handleGithubSignIn() {
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

function LoginContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <>
      {/* GitHub OAuth */}
      <button
        onClick={handleGithubSignIn}
        className="w-full py-2.5 px-4 mb-5
          flex items-center justify-center gap-2.5
          rounded-lg bg-[#111111] hover:bg-[#333333]
          text-white text-sm font-semibold
          transition-colors duration-200 cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
        使用 GitHub 登录
      </button>

      {/* 分割线 */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[#E0DCD1]" />
        <span className="text-xs text-[#999999] font-medium">或</span>
        <div className="flex-1 h-px bg-[#E0DCD1]" />
      </div>

      {/* 邮箱登录表单 */}
      {mode === 'signin' ? (
        <EmailForm
          action={signInWithEmail}
          buttonLabel="登录"
          errorFromUrl={urlError ? '登录失败，请重试' : undefined}
        />
      ) : (
        <EmailForm
          action={signUpWithEmail}
          buttonLabel="注册"
          errorFromUrl={urlError ? '注册失败，请重试' : undefined}
        />
      )}

      {/* 切换登录 / 注册 */}
      <p className="text-center text-sm text-[#999999] mt-5 font-medium">
        {mode === 'signin' ? '还没有账号？' : '已有账号？'}
        <button
          onClick={() =>
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
          }
          className="ml-1 text-[#8B735B] hover:text-[#7A654D] underline underline-offset-2 transition-colors cursor-pointer"
        >
          {mode === 'signin' ? '立即注册' : '去登录'}
        </button>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center
      bg-[#D1CFCA] px-4">

      {/* 装饰性背景圆 */}
      <div
        className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px]
          rounded-full bg-[#C7C4BE] opacity-40 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-100px] left-[-60px] w-[300px] h-[300px]
          rounded-full bg-[#C2BFB8] opacity-30 pointer-events-none"
        aria-hidden="true"
      />

      {/* 登录卡片 */}
      <div className="relative w-full max-w-[400px]">
        <div className="bg-white rounded-2xl shadow-xl shadow-black/10 p-8">

          {/* Logo / 标题区 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center
              w-12 h-12 rounded-xl bg-[#EBE8E1] mb-4">
              <svg
                className="w-6 h-6 text-[#8B735B]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-[#111111] tracking-tight leading-none">
              WooJob
            </h1>
            <p className="text-sm text-[#999999] mt-1 font-medium">
              求职管理系统
            </p>
          </div>

          {/* 动态内容（需要 Suspense 包裹） */}
          <Suspense fallback={<div className="h-48" />}>
            <LoginContent />
          </Suspense>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-[#999999] mt-4">
          登录即表示同意服务条款
        </p>
      </div>
    </div>
  );
}
