import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase 환경변수가 설정되지 않았습니다. .env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 채워주세요."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
