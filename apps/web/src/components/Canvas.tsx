'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '@/lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Item {
  id: string;
  title: string;
  image_url: string;
  price?: number;
  currency?: string;
  x_pos: number;
  y_pos: number;
  rotation: number;
}

const Clipping = ({ item }: { item: Item }) => {
  const [zIndex, setZIndex] = useState(1);

  const updatePosition = async (event: any, info: any) => {
    const newX = item.x_pos + info.offset.x;
    const newY = item.y_pos + info.offset.y;

    await supabase
      .from('items')
      .update({ x_pos: newX, y_pos: newY })
      .eq('id', item.id);
  };

  return (
    <motion.div
      drag
      dragMomentum={true}
      initial={{ 
        x: item.x_pos, 
        y: item.y_pos, 
        rotate: item.rotation || (Math.random() * 20 - 10),
        scale: 0.9,
        opacity: 0
      }}
      animate={{ 
        x: item.x_pos,
        y: item.y_pos,
        scale: 1,
        opacity: 1 
      }}
      whileDrag={{ 
        scale: 1.05, 
        zIndex: 100,
        boxShadow: "12px 12px 0px 0px #8C4637" 
      }}
      onDragStart={() => setZIndex(100)}
      onDragEnd={(e, info) => {
        setZIndex(Math.floor(Math.random() * 10) + 1);
        updatePosition(e, info);
      }}
      className={cn(
        "absolute cursor-grab active:cursor-grabbing",
        "p-2 hover:scale-105 transition-transform duration-200",
        "drop-shadow-[4px_4px_0px_#8C4637]" // Custom drop shadow for the transparent sticker
      )}
      style={{ zIndex }}
    >
      <div className="relative group">
        <img 
          src={item.image_url} 
          alt={item.title} 
          className="w-48 h-auto pointer-events-none filter drop-shadow-sm"
        />
        
        {item.price && (
          <div className="absolute -bottom-2 -right-2 bg-clippings-pink text-clippings-brown px-2 py-0.5 border-2 border-clippings-brown text-sm font-bold shadow-sm rotate-3">
            {item.currency === 'USD' ? '$' : ''}{item.price}
          </div>
        )}
      </div>
      
      <div className="mt-2 text-center">
        <p className="font-display text-xs uppercase tracking-tight truncate w-36">
          {item.title}
        </p>
      </div>
    </motion.div>
  );
};

export const Canvas = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // 1. Initial Fetch
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*');
      
      if (data) setItems(data);
    };

    fetchItems();

    // 2. Real-time Subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems((prev) => [...prev, payload.new as Item]);
          }
          // Handle updates/deletes if needed
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-clippings-cream bg-[radial-gradient(#8C4637_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
      {/* Decorative Checkerboard Border */}
      <div className="absolute inset-0 border-[12px] border-clippings-brown pointer-events-none z-50 opacity-10" />
      
      <div className="absolute top-8 left-8 z-10">
        <h1 className="text-4xl font-display text-clippings-brown drop-shadow-sm">
          My Clippings
        </h1>
        <p className="font-body italic text-clippings-brown/80">
          Digital Scrapbook v0.1
        </p>
      </div>

      {items.map((item) => (
        <Clipping key={item.id} item={item} />
      ))}
    </div>
  );
};
der-clippings-brown pointer-events-none z-50 opacity-10" />
      
      <div className="absolute top-8 left-8 z-10">
        <h1 className="text-4xl font-display text-clippings-brown drop-shadow-sm">
          My Clippings
        </h1>
        <p className="font-body italic text-clippings-brown/80">
          Digital Scrapbook v0.1
        </p>
      </div>

      {items.map((item) => (
        <Clipping key={item.id} item={item} />
      ))}
    </div>
  );
};
