import { relative, dirname } from 'path'
import { fileURLToPath } from 'url'
export const whereisurl = url => {
    const __dirname = dirname(fileURLToPath(url))
    const FILE_MOD_ROOT = relative('./', __dirname) //для считывания файлов. Путь от корня до модуля
    const IMPORT_APP_ROOT = relative(__dirname, './').replace(/\\/g, '/') //Для импорта, без слэша в конце. Путь от модуля до корня.
    return { FILE_MOD_ROOT, IMPORT_APP_ROOT }
}
