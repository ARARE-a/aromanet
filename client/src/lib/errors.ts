type ApiLikeError = {
  message?: string;
  data?: {
    code?: string;
  } | null;
};

function parseValidationMessage(message: string): string | null {
  try {
    const issues = JSON.parse(message);
    if (!Array.isArray(issues)) return null;

    const emailIssue = issues.find((issue) => Array.isArray(issue?.path) && issue.path.includes("email"));
    if (emailIssue) return "メールアドレスの形式が正しくありません";

    const passwordIssue = issues.find((issue) => Array.isArray(issue?.path) && issue.path.includes("password"));
    if (passwordIssue) return "パスワードの形式が正しくありません";

    return "入力内容を確認してください";
  } catch {
    return null;
  }
}

export function getAuthErrorMessage(error: ApiLikeError): string {
  const code = error.data?.code;
  const message = error.message ?? "";
  const normalizedMessage = message.toLowerCase();

  const validationMessage = parseValidationMessage(message);
  if (validationMessage) return validationMessage;

  if (
    normalizedMessage === "load failed" ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("network error") ||
    normalizedMessage.includes("fetch failed")
  ) {
    return "通信に失敗しました。サーバー起動中または回線が不安定な可能性があります。少し待ってからもう一度お試しください。";
  }

  if (code === "INTERNAL_SERVER_ERROR" || message === "INTERNAL_SERVER_ERROR") {
    return import.meta.env.DEV
      ? "ローカル環境のDBに接続できません。DATABASE_URLの設定が必要です。"
      : "サーバーで問題が発生しました。時間をおいて再度お試しください。";
  }

  if (code === "UNAUTHORIZED") return message || "電話番号またはパスワードが違います";
  if (code === "FORBIDDEN") return message || "このアカウントは利用できません";
  if (code === "CONFLICT") return message || "この電話番号は既に登録されています";
  if (code === "BAD_REQUEST") return message || "入力内容を確認してください";

  return message || "エラーが発生しました。もう一度お試しください。";
}
