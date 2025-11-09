import initializeAgent from "./agent/agent.js";
import { getBrowser } from "./util/Browser.js";
import express from "express";


const callAgent = async (prompt) => {
  try {
    const agent = await initializeAgent();
   let stepCount = 0;
    for await (const chunk of await agent.stream(
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      },
      { streamMode: "values" }
    )) {
      const [step, content] = Object.entries(chunk)[0];
      console.log(`step: ${stepCount} ${step}`);
      //console.log(`content: ${JSON.stringify(content, null, 2)}`);
        stepCount++;
    }

    console.log("Done with tasks. Closing browser.");
  } catch (error) {
    console.log(error);
  }
};


callAgent(`search for nandhakrishnan portfolio and msg to him 
    give that i wnt to work with him , with my mail id nk@gmail.com`);
