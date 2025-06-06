
'use client';

import React from 'react';
import Head from 'next/head'; // Import Head for managing document head elements

export default function HomePage() {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Settings Page</title>
        <style jsx global>{`
          body {
            font-family: sans-serif;
            margin: 0;
            background-color: #000;
            color: #fff;
          }

          .container {
            width: 100%;
            max-width: 600px; /* Adjust as needed */
            margin: 0 auto;
            padding: 20px;
          }

          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
          }

          .time {
            font-size: 16px;
          }

          .icons {
            display: flex;
            align-items: center;
          }

          .icons img { /* This selector might need adjustment if using Next/Image */
            margin-left: 5px;
          }

          .header {
            color: #90EE90; /* Light Green */
            font-size: 24px;
            padding: 10px 0;
          }

          .search-icon { /* Assuming this class is intended for an icon, placeholder for now */
            color: #90EE90; /* Light Green */
            font-size: 24px;
          }

          .section {
            background-color: #1e1e1e; /* Darker Gray */
            border-radius: 20px;
            padding: 15px;
            margin-bottom: 15px;
          }

          .section-title {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }

          .section-title img { /* This selector might need adjustment if using Next/Image */
            width: 24px;
            height: 24px;
            margin-right: 10px;
          }

          .section-title h2 {
            font-size: 18px;
            margin: 0;
          }

          .section-details-container {
            font-size: 14px;
            color: #ccc;
            display: flex;
            flex-direction: column;
          }

          .section-details-container > div {
            margin-bottom: 5px;
            display: flex; /* Changed to flex for better bullet alignment */
            align-items: center;
          }

          .section-details-container > div::before {
            content: "\\2022"; /* Bullet point */
            margin-right: 8px; /* Added margin for spacing */
            color: #ccc;
          }

          .section-details-container > div:first-child::before {
            content: none; /* Remove bullet for the first item if not needed */
          }


          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: #000;
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 15px 0;
            border-top: 1px solid #333; /* Added border for separation */
          }

          .bottom-nav img { /* This selector might need adjustment if using Next/Image */
            width: 24px;
            height: 24px;
          }

          .bottom-nav svg {
            fill: #fff;
          }
        `}</style>
      </Head>
      <div className="container">
        <div className="top-bar">
          <div className="time">23:35 &gt;</div> {/* Escaped > */}
          <div className="icons">
            {/* Placeholder for icons, assuming they might be SVGs or image components */}
            <span>📶</span> {/* Example Wifi icon */}
            <span>🔋</span> {/* Example Battery icon */}
            <span>19%</span>
          </div>
        </div>
        <div className="header">Налаштування</div>
        <div className="section">
          <div className="section-title">
            <img src="https://placehold.co/24x24.png" alt="Section Icon" data-ai-hint="settings icon" /> {/* Placeholder */}
            <h2>Загальні</h2>
          </div>
          <div className="section-details-container">
            <div><span>Про цю модель</span></div>
            <div><span>AppleCare+</span><span>Доступно</span></div>
            <div><span>Зображення</span></div>
          </div>
        </div>

        {/* Example of how other sections might look, based on the style provided */}
        <div className="section">
          <div className="section-title">
            {/* <img src="placeholder.png" alt="Another Section Icon" /> */}
            <h2>Інші Налаштування</h2>
          </div>
          <div className="section-details-container">
            <div><span>Сповіщення</span></div>
            <div><span>Звуки та Гаптика</span></div>
            <div><span>Фокус</span></div>
            <div><span>Екранний час</span></div>
          </div>
        </div>

        <div className="bottom-nav">
          {/* Placeholder for bottom nav icons */}
          <img src="https://placehold.co/24x24.png" alt="Nav 1" data-ai-hint="home icon" />
          <img src="https://placehold.co/24x24.png" alt="Nav 2" data-ai-hint="search icon" />
          <img src="https://placehold.co/24x24.png" alt="Nav 3" data-ai-hint="profile icon" />
          <img src="https://placehold.co/24x24.png" alt="Nav 4" data-ai-hint="menu icon" />
        </div>
      </div>
    </>
  );
}
