# Beacon API

How to run?


navigate into api/
bash
docker build -t beacon-api .
docker run -p 3000:3000 beacon-api // or whatever is free



POST /v1/check — JSON body {"text":"..."} → {"isScam":bool,"confidence":"low"|"medium"|"high","matches":string[]}.



Scam example:

curl -s -X POST http://127.0.0.1:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"text":"Please buy gift cards and wire transfer the codes urgently."}'

Okay Example:
curl -s -X POST http://127.0.0.1:3000/v1/check \
  -H "Content-Type: application/json" \
  -d '{"text":"See you at lunch tomorrow."}'