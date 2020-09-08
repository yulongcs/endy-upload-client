// 获取Cookie值
export const getCookie = (name: string) => {
  const reg = new RegExp(`(^| )${name}=([^;]*)(;|$)`);
  const matchRes = document.cookie.match(reg);
  return matchRes?.[2] || '';
};
