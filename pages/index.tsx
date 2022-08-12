import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import NextImage from "next/image";
import { Newspaper } from "../src/newspaper";

const Screenshot = ({ story }: { story: Story }) => {
  const [url, setUrl] = useState<undefined | string>(undefined);
  const [refresh, setRefresh] = useState(1);

  useEffect(() => {
    fetch("/api/cached?refresh=" + refresh + "&url=" + encodeURIComponent(story.url!), {
      method: "GET"
    })
      .then(response => response.json())
      .then(response => {
        setUrl(response.screenshotUrl);
      });
  }, [setUrl, story.url, refresh]);

  return (
    <span
      style={{
        width: "360px",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <h3
        style={{
          display: "block",
          height: "3em",
          textAlign: "center",
          verticalAlign: "bottom"
        }}
      >
        <a href={"https://news.ycombinator.com/item?id=" + story.id}>
          <span>
            <b>{story.score}</b>
          </span>{" "}
          {story.title} [{story.id}]
        </a>
      </h3>

      {url ? (
        <a href={story.url}>
          <img src={url} width={350} height={Math.ceil(350 * Newspaper.Berliner)} />
        </a>
      ) : (
        <div
          style={{
            width: "360px",
            padding: "10px",
            height: Math.ceil(350 * Newspaper.Berliner) + "px",
            backgroundColor: "#ffffff"
          }}
        >
          Fetching image...
        </div>
      )}
      <div style={{ padding: "10px" }}>
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
        {" | "}
        <a href={"https://news.ycombinator.com/item?id=" + story.id}>
          Comments [{story.descendants}]
        </a>
      </div>
    </span>
  );
};

interface Story {
  title: string;
  id: number;
  descendants?: number;
  time: number;
  url?: string;
  score?: number;
}

const Home: NextPage = () => {
  const [sites, setSites] = useState<Story[] | undefined>(undefined);
  const [max, setMax] = useState(20);

  useEffect(() => {
    fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
      .then(r => r.json())
      .then(json => {
        Promise.all(
          json
            .filter((_, index) => index < max)
            .map(id =>
              fetch("https://hacker-news.firebaseio.com/v0/item/" + id + ".json").then(r =>
                r.json()
              )
            )
        ).then(top => setSites(top.filter(s => s.url)));
      });
  }, [setSites, max]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <h2>Top {sites?.length} hackernews stories</h2>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px"
        }}
      >
        {sites ? sites.map((story, index) => <Screenshot key={index} story={story} />) : null}
      </div>
    </div>
  );
};

export default Home;
