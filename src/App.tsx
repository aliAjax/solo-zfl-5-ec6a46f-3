import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import RecordPage from '@/pages/RecordPage'
import TimelinePage from '@/pages/TimelinePage'
import InspirePage from '@/pages/InspirePage'
import AnthologyListPage from '@/pages/AnthologyListPage'
import AnthologyEditPage from '@/pages/AnthologyEditPage'
import AnthologyPreviewPage from '@/pages/AnthologyPreviewPage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<RecordPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/inspire" element={<InspirePage />} />
          <Route path="/anthologies" element={<AnthologyListPage />} />
          <Route path="/anthologies/:id/edit" element={<AnthologyEditPage />} />
          <Route path="/anthologies/:id/preview" element={<AnthologyPreviewPage />} />
        </Route>
      </Routes>
    </Router>
  )
}
