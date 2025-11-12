import initializeAgent from "../agent/agent.js";

const callAgent = async (prompt, res) => {
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
      { streamMode: "values", recursionLimit: 50 }
    )) {
      const [step, content] = Object.entries(chunk)[0];
      console.log(`step: ${stepCount} ${step}`);
      //console.log(content);
      content.map((c) => {
        console.log(`\n action: ${c.name} \n`);
        if (c.name == "model") {
          if (c.tool_calls && c.tool_calls.length > 0) {
            c.tool_calls.map((tc, idx) => {
              console.log(` tool_call -  ${idx} : ${tc.name} \n`);
              res?.write(
                `data: ${JSON.stringify({
                  step: stepCount,
                  action: c.name,
                  tool_call: tc.name,
                  response: tc.response,
                })}\n\n`
              );
            });
          } else {
            console.log(` response: ${JSON.stringify(c.content, null, 2)} \n`);
            res?.write(
              `data: ${JSON.stringify({
                step: stepCount,
                action: c.name,
                response: c.content,
              })}\n\n`
            );
          }
        }
        console.log("----------------------------------- \n");
      });
      //console.log(`content: ${JSON.stringify(content, null, 2)}`);
      stepCount++;
    }

    console.log("Done with tasks. Closing browser.");
  } catch (error) {
    console.log(error);
  }
};

export default callAgent;
