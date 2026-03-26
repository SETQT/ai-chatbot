import type { Metadata } from 'next';
import AntdProvider from './components/AntdProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cô Minh English - AI English Teacher',
  description:
    'Học tiếng Anh cùng Cô Minh - Giáo viên AI vui tính và hài hước!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
