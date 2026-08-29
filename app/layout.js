import './globals.css';
import VizaLoginLink from './VizaLoginLink';

export const metadata = {
  title: 'Encuestas de Satisfacción | Olancho',
  description: 'Sistema independiente para evaluación de la experiencia de usuarios de los servicios de salud.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <VizaLoginLink />
      </body>
    </html>
  );
}
