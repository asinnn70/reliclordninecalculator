async function checkT4() {
  const response = await fetch(`https://api.nextmarket.games/l9asia/v1/sale/c2c?page=0`, {
    method: 'POST',
    headers: {
      'authority': 'api.nextmarket.games',
      'content-type': 'application/json',
      'origin': 'https://l9asia.nextmarket.games',
      'referer': 'https://l9asia.nextmarket.games/',
      'user-agent': 'Mozilla/5.0'
    },
    body: JSON.stringify({
      keyword: "T4 Temporal Piece Chest x50,000",
      realmCode: "NEW_REALM",
      presetId: 36,
      sortType: "PRICE_ASC"
    })
  });
  const data = await response.json();
  console.log("With sortType PRICE_ASC:");
  if (data.content && data.content.length > 0) {
    data.content.slice(0, 3).forEach(x => console.log(x.item?.name, x.cryptoPriceInfo?.price));
  }
}

checkT4();
