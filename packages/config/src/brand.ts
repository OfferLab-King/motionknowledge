export type BrandConfig = Readonly<{
  productName: string;
  domain: string;
  logo: string;
  supportEmail: string;
  defaultTheme: 'professional';
  socialHandles: Readonly<Record<string, string>>;
}>;

export const brand: BrandConfig = Object.freeze({
  productName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? 'MotionKnowledge',
  domain: process.env.NEXT_PUBLIC_PRODUCT_DOMAIN ?? 'motionknowledge.com',
  logo: '/brand/logo.svg',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@motionknowledge.com',
  defaultTheme: 'professional',
  socialHandles: {},
});
