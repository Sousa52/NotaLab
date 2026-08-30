import { Routes, Route } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './pages/Home'
import { ToolsDirectory } from './pages/ToolsDirectory'
import { ToolPage } from './pages/ToolPage'

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/ferramentas" element={<ToolsDirectory />} />
        <Route path="/ferramentas/:slug" element={<ToolPage />} />
      </Route>
    </Routes>
  )
}
