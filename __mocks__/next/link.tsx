import React from 'react';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: React.ReactNode;
};

const NextLink = ({ children, href, ...rest }: LinkProps) =>
  React.createElement('a', { href, ...rest }, children);

export default NextLink;
