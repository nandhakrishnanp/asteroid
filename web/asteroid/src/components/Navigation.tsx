"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageCircle, Home, Zap } from "lucide-react";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}

function NavLink({ href, icon, label, isActive }: NavLinkProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
          isActive
            ? "bg-white/10 text-white border border-white/20"
            : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
        }`}
      >
        {icon}
        <span>{label}</span>
      </motion.div>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white hidden sm:inline">
              Asteroid
            </span>
          </motion.div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          <NavLink
            href="/home"
            icon={<Home className="w-4 h-4" />}
            label="Browser"
            isActive={pathname === "/home"}
          />
          <NavLink
            href="/chat"
            icon={<MessageCircle className="w-4 h-4" />}
            label="Chat"
            isActive={pathname === "/chat"}
          />
        </div>
      </div>
    </motion.nav>
  );
}
