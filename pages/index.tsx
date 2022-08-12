import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import NextImage from "next/image";
import { Newspaper } from "../src/newspaper";

const Screenshot = ({ website }: { website: string }) => {
  const [url, setUrl] = useState<undefined | string>(undefined);
  const [refresh, setRefresh] = useState(1);

  useEffect(() => {
    fetch("/api/cached?refresh=" + refresh + "&url=" + encodeURIComponent(website), {
      method: "GET"
    })
      .then(response => response.json())
      .then(response => {
        setUrl(response.screenshotUrl);
      });
  }, [setUrl, website, refresh]);

  return (
    <div
      style={{
        border: "5px solid black",
        padding: "5px",
        width: "360px",
        boxSizing: "border-box"
      }}
    >
      {url ? (
        <img src={url} width={350} height={Math.ceil(350 * Newspaper.Berliner)} />
      ) : (
        <div
          style={{
            width: "350px",
            height: Math.ceil(350 * Newspaper.Berliner) + "px"
          }}
        >
          Fetching image...
        </div>
      )}
      <div>
        <a
          href="#"
          onClick={event => {
            event.preventDefault();
            setRefresh(refresh + 1);
            setUrl(undefined);
          }}
        >
          Refresh
        </a>
      </div>
    </div>
  );
};

const Home: NextPage = () => {
  return (
    <div
      style={{
        display: "flex"
      }}
    >
      <Screenshot website="https://google.com/?q=Puppeteer" />
      <Screenshot website="https://theguardian.com" />
      <Screenshot website="https://techcrunch.com" />
      <Screenshot website="https://nytimes.com" />
    </div>
  );
};

export default Home;
