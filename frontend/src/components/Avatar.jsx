import { getInitialsColor, initials } from '../utils/format';

export default function Avatar({ name = '', size = 'md', src, online = false, className = '' }) {
  const style = src ? undefined : { background: getInitialsColor(name) };
  return (
    <span className={`avatar avatar-${size} ${className}`} style={style} title={name}>
      {src ? <img src={src} alt={name} /> : initials(name)}
      {online && <span className="avatar-online" />}
    </span>
  );
}
