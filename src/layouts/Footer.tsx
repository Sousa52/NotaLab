import { Link } from 'react-router-dom'
import { Container } from '../components/Container'
import { categories } from '../data/categories'
import { useI18n } from '../i18n'

export function Footer() {
  const t = useI18n()

  return (
    <footer className="border-t border-ink-200 bg-ink-50">
      <Container className="grid gap-10 py-12 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-ink-950">NotaLab</p>
          <p className="mt-2 max-w-xs text-sm text-ink-600">{t.footer.madeFor}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-ink-800">{t.common.categories}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link to={`/ferramentas?categoria=${c.slug}`} className="hover:text-ink-950">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-ink-800">Privacidade</p>
          <p className="mt-3 text-sm text-ink-600">{t.footer.privacyNote}</p>
        </div>
      </Container>

      <Container className="border-t border-ink-200 py-6 text-xs text-ink-400">
        © {new Date().getFullYear()} NotaLab
      </Container>
    </footer>
  )
}
