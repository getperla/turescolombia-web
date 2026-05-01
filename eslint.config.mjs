import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import reactHooks from 'eslint-plugin-react-hooks';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // setState sincrono dentro de useEffect es un patron valido para leer
      // localStorage/sessionStorage tras mount sin causar hydration mismatch
      // en SSR. El rule es demasiado estricto para Next.js Pages Router.
      // Se deja como warn para preservar la visibilidad sin bloquear CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default config;
