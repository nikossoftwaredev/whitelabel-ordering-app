interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function UserAvatar({ src, name, email, size = "md" }: UserAvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name || "User"}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <div className={`flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary ${sizeClass}`}>
      {initial}
    </div>
  );
}
