import React, { useState, useEffect } from "react";
import { Newspaper } from "../../src/newspaper";
import { Story } from "./Story";

export const Screenshot = ({ story }: { story: Story }) => {
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
    <span>
      <h3 className="h-14 grid-flow-col grid place-items-end justify-center pb-3 align-middle">
        <a href={story.url}>{story.title}</a>
      </h3>

      {url ? (
        <a href={story.url} className="inline-block">
          <img src={url} className="w-350 aspect-[315/470] rounded-md" />
        </a>
      ) : (
        <div className="p-4 bg-slate-400 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-md w-350 aspect-[315/470]">
          Fetching image...
        </div>
      )}

      <div className="nav">
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
