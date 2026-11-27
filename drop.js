export function directoryFiles(files) {
  return [...files].map(file => ({ file, path: file.webkitRelativePath || file.name }));
}

async function walk(entry, prefix, result) {
  if (result.length >= 10000) throw new Error('A folder can contain up to 10,000 entries.');
  const path = prefix ? prefix + '/' + entry.name : entry.name;
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    result.push({ file, path });
  } else if (entry.isDirectory) {
    result.push({ path });
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const item of batch) await walk(item, path, result);
    }
  }
}

export async function readDrop(transfer) {
  const entries = [...transfer.items].map(item => item.webkitGetAsEntry?.()).filter(Boolean);
  const fallback = directoryFiles(transfer.files);
  if (!entries.some(entry => entry.isDirectory)) return { folder: false, entries: fallback };
  const result = [];
  for (const entry of entries) await walk(entry, '', result);
  return { folder: true, entries: result };
}

