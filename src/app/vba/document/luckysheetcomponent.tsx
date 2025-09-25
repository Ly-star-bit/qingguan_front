'use client';

import Script from 'next/script';
import Head from 'next/head';
import { useEffect } from 'react';

const LuckysheetComponent = () => {

   


    return (
        <>
            <Head>
                <link rel='stylesheet' href='/dist/plugins/css/pluginsCss.css' />
                <link rel='stylesheet' href='/dist/plugins.css' />
                <link rel='stylesheet' href='/dist/css/luckysheet.css' />
                <link rel='stylesheet' href='/dist/assets/iconfont/iconfont.css' />
            </Head>
            <div id="luckysheet" style={{ margin: '0px', padding: '0px', position: 'absolute', width: '100%', height: '100%', left: '0px', top: '0px' }}></div>
            {/* 使用 Next.js 的 Script 组件加载 JavaScript 文件 */}
            <Script src="/dist/plugins/js/plugin.js" strategy="afterInteractive" key="plugin" />
            <Script src="/dist/luckysheet.umd.js" strategy="afterInteractive" key="luckysheet" />

        </>
    );
};

export default LuckysheetComponent;