import Link from 'next/link'
import { requireProfile } from '@/lib/session'
import { NewObjectForm } from './NewObjectForm'

export default async function NewObjectPage() {
  await requireProfile(['owner'])
  return (
    <>
      <Link href="/" className="btn">← Объекты</Link>
      <h1>Новый объект</h1>
      <div className="card">
        <NewObjectForm />
      </div>
      <div className="card">
        <h2>Какой нужен файл</h2>
        <p className="mut" style={{ marginTop: 0 }}>
          Excel с таблицей позиций. В заголовках должны быть слова: «Наименование», «Ед.», «Кол-во», «Цена». Колонка «Себестоимость» необязательна. Если её нет, себестоимость считается как процент от цены.
          Цены указывайте без НДС. Ваши файлы ВОР из папки КП подходят.
        </p>
      </div>
    </>
  )
}
