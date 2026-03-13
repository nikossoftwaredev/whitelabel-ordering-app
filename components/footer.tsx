import { Link } from "@/lib/i18n/navigation";

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background py-6">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
        <p>
          Made by{" "}
          <a
            href="https://hexaigon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            Hexaigon
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
