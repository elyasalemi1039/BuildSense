const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const client = new S3Client({
  region: "auto",
  endpoint: `https://e2a4ce5a84da399aedb0ac3f3e97b427.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function listObjects() {
  const command = new ListObjectsV2Command({
    Bucket: "buildsense-files",
    Prefix: "ncc/",
    MaxKeys: 20,
  });
  
  const response = await client.send(command);
  console.log("Objects in R2 bucket:");
  console.log(JSON.stringify(response, null, 2));
}

listObjects().catch(console.error);
