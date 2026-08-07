/** @type {import('next').NextConfig} */
const nextConfig = {
  // 같은 Wi-Fi의 휴대폰 등 다른 기기에서 개발 서버(dev)로 접속할 때 필요
  allowedDevOrigins: ["192.168.35.198"],
};

export default nextConfig;
