/* eslint-disable @next/next/no-img-element */
import React from 'react';

type ImgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
};

const NextImage = ({ src, alt, fill: _fill, priority: _priority, ...rest }: ImgProps) => {
  return React.createElement('img', { src, alt, ...rest });
};

export default NextImage;
