export async function generateStaticParams() {
  return [{ callId: 'placeholder' }];
}

export const dynamicParams = true;

export default function Layout({ children }) {
  return children;
}
