"use client";
import Plasma from "@/components/Plasma";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
   
   const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col text-white items-center justify-center bg-black font-sans dark:bg-black">
      <Plasma color="#b885f2" mouseInteractive={false} />
      <div className="absolute">
        <div className="  flex flex-col items-center justify-center space-y-3">
          <h1 className=" text-7xl font-sans">Agent Asteroid</h1>
          <p className=" font-light">Web intelligence unleashed</p>
        </div>
        <div className="   flex items-center justify-center py-3">
           <p
            onClick={()=>{
              router.push("/home")
            }}
           className=" cursor-pointer py-2 px-3 bg-white text-black rounded-full">Get Started</p>
        </div>
      </div>
    </div>
  );
}
