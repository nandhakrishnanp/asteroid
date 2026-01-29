async function search(query) {
  const url = `http://localhost:8001/search?q=${encodeURIComponent(query)}&format=json`;

  try {
    const response = await fetch(url);

    // Check if the HTTP status is 200-299
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log(data)
    const resultd = data.results
      ? data.results.map((item) => ({
          title: item.title,
          link: item.url,
        }))
      : [];
    return resultd;
  } catch (error) {
    console.error("Could not fetch data:", error);
    return []; // Return empty array instead of undefined
  }
}

export { search };
