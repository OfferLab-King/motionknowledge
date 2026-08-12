import type {Metadata} from 'next';
import {brand} from '@motionknowledge/config';
import './globals.css';

export const metadata: Metadata = {
  title: `${brand.productName} — Turn knowledge into explained video`,
  description:
    'Source-grounded, editable visual explanations and finished videos for educators, trainers, and learning teams.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
