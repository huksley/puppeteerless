import React, { useState, useEffect } from "react";
import type { NextPage } from "next";
import NextImage from "next/image";
import { Newspaper } from "../src/newspaper";
import { useRouter } from "next/router";

const Home: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/top", undefined, { shallow: true });
  }, [router]);

  return null;
};

export default Home;
