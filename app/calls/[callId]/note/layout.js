export async function generateStaticParams() {
  return [{ callId: 'placeholder' }];
}

export const dynamicParams = true;

export default function NoteLayout({ children }) {
  return children;
}
