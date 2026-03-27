'use client';

import { ConfigProvider, theme, App } from 'antd';

export default function AntdProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0958d9',
          colorInfo: '#0958d9',
          borderRadius: 8,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            bodyBg: '#f8fafc',
            headerBg: '#ffffff',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#f0f7ff',
            itemSelectedColor: '#0958d9',
            itemColor: '#64748b',
            itemHoverColor: '#0958d9',
          },
          Input: {
            colorBgContainer: '#f1f5f9',
            colorBorder: 'transparent',
            activeBorderColor: '#0958d9',
            hoverBorderColor: '#0958d9',
          },
          Button: {
            colorPrimary: '#0958d9',
            colorPrimaryHover: '#4096ff',
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
