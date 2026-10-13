/** Main App component. */
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { CompositionList } from './components/CompositionList';
import { CompositionForm } from './components/CompositionForm';
import { CompositionDetail } from './components/CompositionDetail';
import { TemplatesPage } from './components/TemplatesPage';
import './App.css';

function Header() {
  const location = useLocation();

  return (
    <header className="app-header">
      <div className="header-content">
        <h1>
          <Link to="/" className="brand-link">
            Nexus Foundry
          </Link>
        </h1>
        <nav className="header-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Compositions
          </Link>
          <Link to="/templates" className={location.pathname === '/templates' ? 'active' : ''}>
            Templates
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="app-footer">
      <p>Nexus Foundry — Write HTML. Render video. Built for agents.</p>
      <p>Ryan Vo ryandtvo@gmail.com</p>
    </footer>
  );
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<CompositionList />} />
          <Route path="/compositions/new" element={<CompositionForm />} />
          <Route path="/compositions/:id" element={<CompositionDetail />} />
          <Route path="/compositions/:id/edit" element={<CompositionForm />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}