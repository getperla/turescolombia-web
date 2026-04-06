import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

// Redirigir /tours a /explorar
export default function ToursRedirect() {
  const router = useRouter();
  if (typeof window !== 'undefined') router.replace('/explorar');
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/explorar', permanent: true } };
};
