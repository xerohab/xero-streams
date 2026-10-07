/** Only Asher Crawford's titles are Xero Streams Exclusives. Other authors are never exclusive by default. */
export const isExclusiveAuthor = (author) =>
  !!author?.name && author.name.toLowerCase().includes("asher crawford");