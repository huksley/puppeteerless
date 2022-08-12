import React, { useState, useEffect, useCallback } from "react";
import type { NextPage } from "next";
import NextImage from "next/image";
import { useRouter } from "next/router";
import { Story } from "./Story";
import { Screenshot } from "./Screenshot";

const Home: NextPage = () => {
  const router = useRouter();
  const [sites, setSites] = useState<Story[] | undefined>(undefined);
  const [max, setMax] = useState(20);
  const type = router.query.type;
  const [loading, setLoading] = useState(false);

  const setType = useCallback(
    (type: string) => {
      router.push("/" + type, undefined, { shallow: true });
    },
    [router]
  );

  useEffect(() => {
    if (type) {
      setLoading(true);
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
          ).then(top => {
            setSites(top.filter(s => s.url));
            setLoading(false);
          });
        });
    } else {
      console.info("no type");
    }
  }, [setSites, max, type, setLoading]);

  return (
    <div className="mx-8 mflex flex-col justify-center  md:mx-14 lg:mx-24">
      <h2 className="text-lg pt-8">{type} hackernews stories</h2>
      <div className="nav pb-8">
        <a
          href="#"
          className={type === "top" && loading ? "loading" : ""}
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
          className={type === "new" && loading ? "loading" : ""}
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
          className={type === "best" && loading ? "loading" : ""}
          onClick={event => {
            event?.preventDefault();
            setType("best");
          }}
        >
          best
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
        {sites ? sites.map((story, index) => <Screenshot key={index} story={story} />) : null}
      </div>

      <div className="nav pt-8">
        <a
          className=""
          href="#"
          onClick={event => {
            event.preventDefault();
            setMax(max + 10);
          }}
        >
          Load more
        </a>
      </div>
    </div>
  );
};

export default Home;
