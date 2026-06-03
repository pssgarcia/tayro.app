import { Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">UGC Platform — Login em breve</p>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
