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
          display: "flex",
          flexDirection: "column",
          height: "3em",
          textAlign: "center",
          justifyContent: "end",
          marginBottom: "0.5em"
        }}
      >
        <a
          href={story.url}
          style={{
            display: "inline-block"
          }}
        >
          <span>
            <b>{story.score}</b>
          </span>{" "}
          {story.title}
        </a>
      </h3>

      {url ? (
        <a href={story.url}>
          <img src={url} width={360} height={Math.ceil(360 * Newspaper.Berliner)} />
        </a>
      ) : (
        <div
          style={{
            width: "360px",
            height: Math.ceil(360 * Newspaper.Berliner) + "px",
            backgroundColor: "#ffffff"
          }}
        >
          Fetching image...
        </div>
      )}
      <div style={{ paddingTop: "0.5em" }}>
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
  const [type, setType] = useState("top");

  useEffect(() => {
    fetch("https://hacker-news.firebaseio.com/v0/" + type + "stories.json")
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
  }, [setSites, max, type]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <h2
        style={{
          marginTop: "0.5em",
          marginBottom: "0.5em"
        }}
      >
        {type} {sites?.length} hackernews stories
      </h2>

      <div
        style={{
          marginBottom: "2em"
        }}
      >
        <a
          href="#"
          onClick={event => {
            event?.preventDefault();
            setType("top");
          }}
        >
          top
        </a>
        {" | "}
        <a
          href="#"
          onClick={event => {
            event?.preventDefault();
            setType("new");
          }}
        >
          new
        </a>
        {" | "}
        <a
          href="#"
          onClick={event => {
            event?.preventDefault();
            setType("best");
          }}
        >
          best
        </a>
      </div>

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
