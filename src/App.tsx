import { Routes, Route } from 'react-router-dom'
import { RootLayout } from './layouts/RootLayout'
import { Home } from './pages/Home'
import { ToolsDirectory } from './pages/ToolsDirectory'

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/ferramentas" element={<ToolsDirectory />} />
      </Route>
    </Routes>
  )
}
