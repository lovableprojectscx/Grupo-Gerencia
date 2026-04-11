import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

async function run() {
  const { data, error } = await supabase.from('courses').select('*, instructors!course_instructors(*)').eq('slug', 'cartografia-y-clasificacion-de-suelos')
  console.log(JSON.stringify(data?.[0], null, 2))
}
run()
