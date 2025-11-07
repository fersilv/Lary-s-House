import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import type { PartyEvent, Photo, MenuCategory, OracleQuery } from '../types';
import * as adminService from '../services/adminService';
import { resizeImage } from '../services/imageService';
import CocktailIcon from './icons/CalendarIcon';
import MusicNoteIcon from './icons/ClockIcon';
import PizzaIcon from './icons/GiftIcon';
import ShareIcon from './icons/ShareIcon';

const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const [elements, setElements] = useState<Element[]>([]);
    const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (elements.length > 0) {
            observer.current = new IntersectionObserver(observedEntries => {
                setEntries(observedEntries);
            }, options);
            elements.forEach(element => observer.current?.observe(element));
        }
        return () => observer.current?.disconnect();
    }, [elements, options]);

    return [setElements, entries] as const;
};

const Header: React.FC = () => {
    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <header className="fixed top-0 left-0 w-full bg-black/30 backdrop-blur-sm z-50 p-4">
            <nav className="max-w-6xl mx-auto flex justify-between items-center">
                <a href="#home" onClick={(e) => handleNavClick(e, 'home')} className="font-logo text-2xl text-white text-glow transition-transform hover:scale-105">Lary's House</a>
                <div className="flex items-center space-x-6">
                    <div className="space-x-6 hidden md:block">
                        <a href="#home" onClick={(e) => handleNavClick(e, 'home')} className="text-white hover:text-[var(--primary-color)] transition-colors duration-300">Home</a>
                        <a href="#eventos" onClick={(e) => handleNavClick(e, 'eventos')} className="text-white hover:text-[var(--primary-color)] transition-colors duration-300">Eventos</a>
                        <a href="#cardapio" onClick={(e) => handleNavClick(e, 'cardapio')} className="text-white hover:text-[var(--primary-color)] transition-colors duration-300">Cardápio</a>
                        <a href="#oraculo" onClick={(e) => handleNavClick(e, 'oraculo')} className="text-white hover:text-[var(--primary-color)] transition-colors duration-300">Oráculo</a>
                         <a href="#pocoes" onClick={(e) => handleNavClick(e, 'pocoes')} className="text-white hover:text-[var(--primary-color)] transition-colors duration-300">Poções</a>
                        <a href="#fotos" onClick={(e) => handleNavClick(e, 'fotos')} className="text-white hover:text-[var(--primary-color)] transition-colors duration-300">Fotos</a>
                    </div>
                </div>
            </nav>
        </header>
    );
};

const SplashScreen: React.FC<{onEnter: () => void; isExiting: boolean}> = ({onEnter, isExiting}) => (
    <div className={`h-screen w-full flex flex-col items-center justify-center text-center text-white bg-black p-4 fixed inset-0 z-[100] overflow-hidden ${isExiting ? 'splash-exit-active' : ''}`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{'--grid-color': 'var(--primary-color)'} as React.CSSProperties}></div>
        <div className="relative z-10">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-logo leading-none text-glow animate-neon-flicker">Lary's House</h1>
            <p className="text-lg md:text-xl font-light tracking-wider mt-4">A casa dos drink's e das resenhas</p>
            <button onClick={onEnter} className="mt-12 px-10 py-4 rounded-lg text-black font-bold text-xl bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] hover:scale-105 transition-transform shadow-[0_0_20px_var(--primary-color)] animate-pulse">
                Entrar na Festa
            </button>
        </div>
    </div>
);


const PhotoUploadModal: React.FC<{ eventId: string; onClose: () => void; onUpload: () => void }> = ({ eventId, onClose, onUpload }) => {
    const [uploaderName, setUploaderName] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const fileList = Array.from(e.target.files);
            setFiles(fileList);
            
            const newPreviews = fileList.map((file: File) => URL.createObjectURL(file));
            setPreviews(prev => {
                prev.forEach(p => URL.revokeObjectURL(p));
                return newPreviews;
            });
        }
    };

    useEffect(() => {
        return () => previews.forEach(p => URL.revokeObjectURL(p));
    }, [previews]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploaderName.trim() || files.length === 0) {
            setError('Por favor, preencha seu nome e selecione pelo menos uma foto.');
            return;
        }
        setIsUploading(true);
        setError('');
        try {
            const photosData = await Promise.all(
                files.map(async file => ({
                    eventId,
                    uploaderName,
                    base64: await resizeImage(file)
                }))
            );
            adminService.addPendingPhotos(photosData);
            onUpload();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Falha ao enviar as fotos. Verifique o console para mais detalhes. O armazenamento do navegador pode estar cheio.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] p-8 rounded-lg shadow-lg w-full max-w-lg relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl z-10">&times;</button>
                <h3 className="text-2xl font-bold mb-4 text-center text-glow font-display" style={{color: 'var(--primary-color)'}}>Enviar Fotos</h3>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
                    <div className="mb-4">
                        <label htmlFor="uploaderName" className="block mb-2 text-white/80">Seu Nome</label>
                        <input type="text" id="uploaderName" value={uploaderName} onChange={e => setUploaderName(e.target.value)} className="w-full bg-black/30 p-2 border border-white/20 rounded focus:outline-none focus:border-[var(--primary-color)]" required />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="photoFile" className="block mb-2 text-white/80">Suas Fotos</label>
                        <input type="file" id="photoFile" onChange={handleFileChange} accept="image/*" multiple className="w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary-color)] file:text-black hover:file:bg-opacity-80" required />
                    </div>
                     {previews.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-4 h-48 overflow-y-auto border border-white/10 p-2 rounded-lg">
                            {previews.map((preview, index) => (
                                <img key={index} src={preview} alt="Preview" className="w-full h-full object-cover rounded"/>
                            ))}
                        </div>
                    )}
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <button type="submit" disabled={isUploading} className="w-full py-3 bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-black font-bold rounded hover:opacity-90 disabled:opacity-50">
                        {isUploading ? `Enviando ${files.length} fotos...` : 'Enviar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Lightbox: React.FC<{ images: string[]; startIndex: number; onClose: () => void }> = ({ images, startIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, onClose]);
    
    return (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <img 
                src={`data:image/jpeg;base64,${images[currentIndex]}`} 
                alt="Imagem expandida" 
                className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl shadow-black select-none"
                onClick={e => e.stopPropagation()}
            />
            <button onClick={onClose} className="absolute top-2 right-2 text-white/80 text-4xl hover:text-white transition-colors">&times;</button>
            {images.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white text-3xl p-2 rounded-full hover:bg-black/50 transition-colors">‹</button>
                    <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white text-3xl p-2 rounded-full hover:bg-black/50 transition-colors">›</button>
                </>
            )}
        </div>
    );
};

const PhotoGalleryModal: React.FC<{ event: PartyEvent; allPhotos: Photo[]; onClose: () => void; onImageClick: (photos: Photo[], clickedPhotoId: string) => void; }> = ({ event, allPhotos, onClose, onImageClick }) => {
    const eventPhotos = allPhotos.filter(p => p.eventId === event.id);

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-transparent p-4 sm:p-8 rounded-lg w-full max-w-5xl h-[90vh] relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-0 right-0 sm:top-2 sm:right-2 text-white text-3xl hover:text-[var(--primary-color)] z-10">&times;</button>
                <h3 className="text-3xl font-display text-center mb-6 text-glow" style={{color: 'var(--primary-color)'}}>Fotos de {event.title}</h3>
                {eventPhotos.length > 0 ? (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-[calc(100%-60px)] overflow-y-auto">
                        {eventPhotos.map(photo => {
                            const imageBase64 = adminService.getPhotoImage(photo.path);
                            if (!imageBase64) return null;
                            return (
                                 <div key={photo.id} className="aspect-square cursor-pointer" onClick={() => onImageClick(eventPhotos, photo.id)}>
                                    <img src={`data:image/jpeg;base64,${imageBase64}`} alt={`Foto de ${photo.uploaderName}`} className="rounded-lg w-full h-full object-cover transition-transform hover:scale-105" />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/70">Nenhuma foto encontrada para este evento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ShareModal: React.FC<{ potion: any; theme: any; onClose: () => void }> = ({ potion, theme, onClose }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [status, setStatus] = useState('Gerando imagem...');

    const generateImageDataUrl = useCallback(async (potionData: any): Promise<string> => {
        try {
            const fontName = theme.fontFamily.split(',')[0].replace(/'/g, '');
             await Promise.all([
                document.fonts.load('36px Pacifico'),
                document.fonts.load('18px Audiowide'),
                document.fonts.load(`14px ${fontName}`)
            ]);
        } catch (error) {
            console.warn("Font loading failed, generated image might look incorrect.", error);
        }

        const { primaryColor, secondaryColor, backgroundColor, fontFamily } = theme;
        const width = 600;
        const height = 900;

        const ingredientsList = (potionData.ingredients || []).map((ing: string) => `<li>${ing}</li>`).join('');

        const htmlContent = `
            <div style="background-color: ${backgroundColor}; color: white; font-family: ${fontFamily}; width: ${width}px; height: ${height}px; padding: 40px; display: flex; flex-direction: column; border: 2px solid ${primaryColor}; box-shadow: 0 0 10px ${primaryColor};">
                <h2 style="font-family: 'Pacifico', cursive; color: ${secondaryColor}; font-size: 36px; text-align: center; margin: 0 0 10px; text-shadow: 0 0 5px ${secondaryColor};">${potionData.drinkName}</h2>
                <p style="font-style: italic; text-align: center; font-size: 14px; color: #ccc; margin-bottom: 20px;">"${potionData.story}"</p>
                <div style="border-top: 1px dashed ${primaryColor}; margin-bottom: 20px;"></div>
                <h3 style="color: ${primaryColor}; font-size: 18px; margin-bottom: 10px;">Ingredientes:</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin: 0; font-size: 14px; color: #ddd;">
                    ${ingredientsList}
                </ul>
                 <h3 style="color: ${primaryColor}; font-size: 18px; margin-top: 20px; margin-bottom: 10px;">Conselho do Oráculo:</h3>
                 <p style="font-size: 14px; color: #ddd;">${potionData.advice}</p>
                 <div style="flex-grow: 1;"></div>
                 <p style="text-align: center; font-family: 'Audiowide', cursive; color: white; opacity: 0.7; font-size: 18px;">Lary's House</p>
            </div>
        `;

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
                <foreignObject width="100%" height="100%">
                    <div xmlns="http://www.w3.org/1999/xhtml">
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Pacifico&family=${fontFamily.replace(/'/g, '').replace(' ', '+')}:wght@400&display=swap');
                        </style>
                        ${htmlContent}
                    </div>
                </foreignObject>
            </svg>
        `;

        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    URL.revokeObjectURL(url);
                    return reject(new Error('Failed to get canvas context'));
                }
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (err) => {
                 URL.revokeObjectURL(url);
                 reject(new Error('Image loading failed. This can happen if the browser fails to render the SVG, possibly due to font issues.'));
            };
            img.src = url;
        });
    }, [theme]);
    
    useEffect(() => {
        generateImageDataUrl(potion)
            .then(url => {
                setImageUrl(url);
                setStatus('Pronto!');
            })
            .catch(err => {
                console.error("Failed to generate image:", err);
                setStatus(`Erro ao gerar imagem. ${err.message}`);
            });
    }, [potion, generateImageDataUrl]);

    const handleCopyText = () => {
        const text = `
Poção da Lary's House: ${potion.drinkName}
"${potion.story}"

Ingredientes:
${(potion.ingredients || []).map((ing: string) => `- ${ing}`).join('\n')}

Modo de Preparo:
${potion.preparation}

Efeitos Colaterais:
${(potion.sideEffects || []).map((eff: string) => `- ${eff}`).join('\n')}

Conselho do Oráculo:
${potion.advice}
        `.trim();
        navigator.clipboard.writeText(text).then(() => alert('Receita copiada para a área de transferência!'));
    };
    
    const handleCopyImage = async () => {
        if (!imageUrl) return;
        try {
            const blob = await (await fetch(imageUrl)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            alert('Imagem copiada para a área de transferência!');
        } catch (error) {
            console.error('Failed to copy image:', error);
            alert('Seu navegador não suporta copiar imagens. Tente salvar a imagem.');
        }
    };
    
    const handleSaveImage = () => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${potion.drinkName.replace(/\s+/g, '_').toLowerCase()}_larys_house.png`;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] p-6 rounded-lg shadow-lg w-full max-w-xl relative flex flex-col" onClick={e => e.stopPropagation()}>
                 <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl z-10">&times;</button>
                 <h3 className="text-2xl font-bold mb-4 text-center text-glow font-display" style={{color: 'var(--primary-color)'}}>Compartilhar Poção</h3>
                 <div className="bg-black/30 p-4 rounded-lg flex items-center justify-center min-h-[300px]">
                    {imageUrl ? (
                        <img src={imageUrl} alt="Prévia da poção" className="max-w-full max-h-[40vh] rounded-md"/>
                    ) : (
                        <p>{status}</p>
                    )}
                 </div>
                 <div className="mt-6 flex flex-col sm:flex-row gap-4">
                     <button onClick={handleCopyText} className="w-full font-bold bg-white/10 text-white py-3 rounded-lg hover:bg-white/20 transition-colors">Copiar Texto</button>
                     <button onClick={handleCopyImage} disabled={!imageUrl} className="w-full font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg disabled:opacity-50">Copiar Imagem</button>
                     <button onClick={handleSaveImage} disabled={!imageUrl} className="w-full font-bold bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-black py-3 rounded-lg disabled:opacity-50">Salvar Imagem</button>
                 </div>
            </div>
        </div>
    );
};

const PotionDetailsModal: React.FC<{ query: OracleQuery; onClose: () => void }> = ({ query, onClose }) => {
    const { result } = query;
    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#1a1a1a] p-8 rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white text-2xl z-10">&times;</button>
                <div className="overflow-y-auto pr-4">
                    <h4 className="text-3xl font-display text-center text-[var(--secondary-color)] text-glow mb-4">{result.drinkName}</h4>
                    <p className="italic text-white/70 mb-4 text-center">"{result.story}"</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <p className="font-bold mb-2 text-[var(--primary-color)]">Ingredientes:</p>
                            <ul className="list-disc list-inside text-white/80 space-y-1">
                                {(result.ingredients || []).map((ing: string, i: number) => <li key={i}>{ing}</li>)}
                            </ul>
                        </div>
                        <div>
                            <p className="font-bold mb-2 text-[var(--primary-color)]">Modo de Preparo:</p>
                            <p className="text-white/80 whitespace-pre-line">{result.preparation}</p>
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-4 mt-4">
                        <p className="font-bold mb-2 text-[var(--primary-color)]">Efeitos Colaterais:</p>
                        <ul className="list-disc list-inside text-white/80 space-y-1">
                            {(result.sideEffects || []).map((effect: string, i: number) => <li key={i}>{effect}</li>)}
                        </ul>
                    </div>
                        <div className="border-t border-white/10 pt-4 mt-6">
                        <p className="font-bold mb-2 text-[var(--primary-color)]">Conselho do Oráculo:</p>
                        <p className="text-white/80">{result.advice}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface MainSiteProps {
  events: PartyEvent[];
  heroImage: string | null;
  approvedPhotos: Photo[];
  menu: MenuCategory[];
  oracleHistory: OracleQuery[];
  onPhotoUpload: () => void;
  onOracleQuery: () => void;
}

const formatDateForDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate + 'T00:00:00');
    const weekDay = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
    const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date);
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    return `${weekDay.charAt(0).toUpperCase() + weekDay.slice(1)}, ${day} de ${month}`;
};

const Section: React.FC<{ id: string; children: React.ReactNode; className?: string }> = ({ id, children, className = '' }) => {
    const [setElements, entries] = useIntersectionObserver({ threshold: 0.1 });
    const animatedElements = useRef<Array<HTMLDivElement | null>>([]);
    animatedElements.current = [];

    useEffect(() => {
        const elementsToObserve = animatedElements.current.filter(el => el !== null) as Element[];
        setElements(elementsToObserve);
    }, [setElements, children]);

    useEffect(() => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, [entries]);

    const childrenWithRefs = React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
            return <div ref={el => animatedElements.current[index] = el} className="animate-fade-in-up">{child}</div>;
        }
        return child;
    });

    return (
        <section id={id} className={`py-20 px-6 md:px-12 ${className} relative overflow-hidden`}>
            <div className="max-w-6xl mx-auto text-center relative z-10">{childrenWithRefs}</div>
        </section>
    );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-4xl md:text-5xl font-display text-glow" style={{color: 'var(--primary-color)'}}>{children}</h2>
);

const FloatingIcons: React.FC = () => (
    <div className="fixed top-0 left-0 w-full h-full z-[0] overflow-hidden pointer-events-none">
        <CocktailIcon className="absolute w-12 h-12 text-[var(--primary-color)] opacity-20" style={{ top: '20%', left: '10%', animation: 'float 8s ease-in-out infinite' }}/>
        <MusicNoteIcon className="absolute w-10 h-10 text-[var(--secondary-color)] opacity-20" style={{ top: '50%', left: '85%', animation: 'float-reverse 10s ease-in-out infinite' }}/>
        <PizzaIcon className="absolute w-16 h-16 text-[var(--primary-color)] opacity-20" style={{ top: '80%', left: '20%', animation: 'float 12s ease-in-out infinite' }}/>
        <CocktailIcon className="absolute w-8 h-8 text-[var(--secondary-color)] opacity-20" style={{ top: '15%', left: '70%', animation: 'float-reverse 7s ease-in-out infinite' }}/>
    </div>
);

const EventCard: React.FC<{event: PartyEvent; isFeatured?: boolean; onUploadClick: (id: string) => void; isPast?: boolean; onPastEventClick?: (event: PartyEvent) => void; onImageClick: (images: string[], startIndex: number) => void;}> = ({ event, isFeatured = false, onUploadClick, isPast = false, onPastEventClick, onImageClick }) => {
    
    const coverImage = event.coverImagePath ? adminService.getPhotoImage(event.coverImagePath) : null;
    const CardWrapper: React.ElementType = onPastEventClick ? 'button' : 'div';
    const allowUpload = isPast;

    const content = (
        <>
            {event.status === 'cancelled' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-sm">
                    <span className="text-2xl md:text-3xl font-bold text-red-500 border-2 border-red-500 p-2 md:p-4 rounded-lg transform -rotate-12 select-none">CANCELADO</span>
                </div>
            )}
            <div className={`w-full bg-black/20 flex-shrink-0 ${isFeatured ? 'md:w-1/2 h-full' : 'h-48 sm:h-64'}`}>
                {coverImage && (
                    <button onClick={() => onImageClick([coverImage], 0)} className="w-full h-full block">
                        <img src={`data:image/jpeg;base64,${coverImage}`} alt={`Capa para ${event.title}`} className="w-full h-full object-contain" />
                    </button>
                )}
            </div>
            <div className="p-8 flex flex-col items-center flex-grow text-center">
                <h3 className={`font-display text-[var(--secondary-color)] mb-4 ${isFeatured ? 'text-4xl' : 'text-3xl'}`}>{event.title}</h3>
                <p className="font-bold">{formatDateForDisplay(event.date)} às {event.time}</p>
                <p className="mt-4 text-white/80 max-w-sm flex-grow">{event.description}</p>
                <div className='flex flex-wrap justify-center gap-4 mt-6'>
                    {event.mapLink && <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="inline-block bg-transparent text-white py-2 px-6 rounded-full border-2 border-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-black transition-colors">Ver no mapa</a>}
                    {event.status !== 'cancelled' && allowUpload && (
                         <button onClick={(e) => { e.stopPropagation(); onUploadClick(event.id); }} className="inline-block bg-[var(--primary-color)] text-black font-bold py-2 px-6 rounded-full hover:opacity-80 transition-opacity">Enviar Foto</button>
                    )}
                </div>
            </div>
        </>
    );

    return (
        <CardWrapper 
            onClick={onPastEventClick ? () => onPastEventClick(event) : undefined}
            className={`bg-black/40 rounded-lg border border-white/10 overflow-hidden flex ${isFeatured ? 'flex-col md:flex-row' : 'flex-col'} hover:border-[var(--primary-color)] transition-all duration-300 transform hover:-translate-y-2 relative group text-left w-full ${isPast ? 'opacity-60 hover:opacity-100 cursor-pointer' : ''}`}
        >
            {content}
        </CardWrapper>
    )
}

const MainSite: React.FC<MainSiteProps> = ({ events, heroImage, approvedPhotos, menu, oracleHistory, onPhotoUpload, onOracleQuery }) => {
    const [entered, setEntered] = useState(false);
    const [isExitingSplash, setIsExitingSplash] = useState(false);
    const [theme, setTheme] = useState(adminService.getTheme());
    
    const [uploadModalEventId, setUploadModalEventId] = useState<string | null>(null);
    const [modalGalleryEvent, setModalGalleryEvent] = useState<PartyEvent | null>(null);
    const [oracleFeeling, setOracleFeeling] = useState("");
    const [oracleResult, setOracleResult] = useState<any>(null);
    const [isOracleLoading, setIsOracleLoading] = useState(false);
    const [sharePotion, setSharePotion] = useState<any | null>(null);
    const [selectedPotion, setSelectedPotion] = useState<OracleQuery | null>(null);
    const [lightbox, setLightbox] = useState<{ images: string[]; startIndex: number } | null>(null);

    const handleEnter = useCallback(() => {
        setIsExitingSplash(true);
        setTimeout(() => setEntered(true), 1000);
    }, []);

    const openLightbox = (photoList: Photo[], clickedPhotoId: string) => {
        const images = photoList.map(p => adminService.getPhotoImage(p.path)).filter((img): img is string => !!img);
        const startIndex = photoList.findIndex(p => p.id === clickedPhotoId);
        if (startIndex !== -1 && images.length > 0) {
            setLightbox({ images, startIndex });
        }
    };

    const handleOracleQuery = async () => {
        if (!oracleFeeling.trim()) return;
        setIsOracleLoading(true);
        setOracleResult(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Você é o Oráculo místico da Lary's House, uma boate de luxo. Um cliente está se sentindo "${oracleFeeling}". Com base nesse sentimento e no cardápio a seguir, crie um drink exclusivo. Cardápio: ${JSON.stringify(menu)}. Sua resposta DEVE SER um único objeto JSON contendo nome, história, ingredientes, modo de preparo, efeitos colaterais e um conselho.`;
            
             const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          drinkName: { type: Type.STRING, description: "Nome místico e criativo para o drink." },
                          story: { type: Type.STRING, description: "Uma história curta e mística sobre a origem ou poder do drink." },
                          ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Lista de ingredientes para o drink."
                          },
                          preparation: {
                            type: Type.STRING,
                            description: "Modo de preparo passo-a-passo do drink."
                          },
                          sideEffects: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Uma lista com exatamente 2 efeitos colaterais engraçados ou absurdos do drink."
                          },
                          advice: { type: Type.STRING, description: "Um conselho de vida curto, absurdo e divertido do Oráculo." }
                        },
                        required: ["drinkName", "story", "ingredients", "preparation", "sideEffects", "advice"],
                    }
                }
            });
            const resultText = response.text.trim();
            const resultData = JSON.parse(resultText);
            setOracleResult(resultData);
            adminService.saveOracleQuery({ feeling: oracleFeeling, result: resultData });
            onOracleQuery();

        } catch (error) {
            console.error("Oracle Error:", error);
            setOracleResult({ error: "O Oráculo está com dor de cabeça. Tente novamente mais tarde." });
        } finally {
            setIsOracleLoading(false);
        }
    };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const futureEventsRaw = events.filter(e => new Date(e.date + 'T00:00:00') >= today).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const nextEvent = futureEventsRaw.find(e => e.status !== 'cancelled') || null;
    const futureEvents = futureEventsRaw.filter(e => e.id !== nextEvent?.id);

    const pastEvents = events.filter(e => new Date(e.date + 'T00:00:00') < today).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!entered) {
        return <SplashScreen onEnter={handleEnter} isExiting={isExitingSplash} />;
    }

    return (
    <div className="bg-transparent text-white relative">
      <Header />
      {uploadModalEventId && <PhotoUploadModal eventId={uploadModalEventId} onClose={() => setUploadModalEventId(null)} onUpload={onPhotoUpload} />}
      {modalGalleryEvent && <PhotoGalleryModal event={modalGalleryEvent} allPhotos={approvedPhotos} onClose={() => setModalGalleryEvent(null)} onImageClick={openLightbox} />}
      {sharePotion && <ShareModal potion={sharePotion} theme={theme} onClose={() => setSharePotion(null)} />}
      {selectedPotion && <PotionDetailsModal query={selectedPotion} onClose={() => setSelectedPotion(null)} />}
      {lightbox && <Lightbox images={lightbox.images} startIndex={lightbox.startIndex} onClose={() => setLightbox(null)} />}
      
       <FloatingIcons />

      <header id="home" className="relative h-screen w-full flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-[2]"></div>
        {heroImage && (
             <img src={`data:image/jpeg;base64,${heroImage}`} alt="Lary's House" className="absolute inset-0 w-full h-full object-cover z-[1]"/>
        )}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 z-[3]" style={{'--grid-color': 'var(--secondary-color)'} as React.CSSProperties}></div>
        <div className="relative z-10 text-center px-4">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-logo leading-none text-glow animate-neon-flicker">Lary's House</h1>
          <p className="mt-4 text-xl md:text-2xl font-light tracking-wider">A casa dos drink's e das resenhas</p>
          {nextEvent && (
            <div className="mt-8 p-4 border-2 border-[var(--secondary-color)] rounded-lg bg-black/30 backdrop-blur-sm inline-block animate-fade-in-up">
              <p className="text-sm uppercase tracking-widest text-[var(--secondary-color)]">Próxima Festa</p>
              <h2 className="text-3xl font-display text-white mt-1">{nextEvent.title}</h2>
              <p className="text-lg font-bold text-white/80">{formatDateForDisplay(nextEvent.date)}</p>
            </div>
          )}
          <br />
          <a href="#eventos" onClick={(e) => { e.preventDefault(); document.getElementById('eventos')?.scrollIntoView({ behavior: 'smooth' }); }} className="mt-8 inline-block px-8 py-3 rounded-lg text-white font-bold text-lg bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] hover:scale-105 transition-transform">Ver Eventos</a>
        </div>
      </header>

      <main className="relative z-10 bg-[var(--background-color)]">
        <Section id="eventos" className="bg-black/20">
            <SectionTitle>Eventos</SectionTitle>
            
            {nextEvent && [
                <h3 key="h-destaque" className="text-3xl font-display text-[var(--secondary-color)] mt-12 mb-8">Destaque</h3>,
                <div key="c-destaque" className="flex justify-center">
                    <div className="w-full max-w-5xl">
                        <EventCard event={nextEvent} isFeatured={true} onUploadClick={setUploadModalEventId} onImageClick={(images, startIndex) => setLightbox({ images, startIndex })}/>
                    </div>
                </div>
            ]}

             {futureEvents.length > 0 && [
                <h3 key="h-proximos" className="text-3xl font-display text-white/80 mt-12 mb-8">Próximos Eventos</h3>,
                <div key="c-proximos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {futureEvents.map(event => <EventCard key={event.id} event={event} onUploadClick={setUploadModalEventId} onImageClick={(images, startIndex) => setLightbox({ images, startIndex })} />)}
                </div>
            ]}

            {pastEvents.length > 0 && [
                <h3 key="h-passados" className="text-3xl font-display text-white/60 mt-12 mb-8">Eventos Passados</h3>,
                <div key="c-passados" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {pastEvents.map(event => <EventCard key={event.id} event={event} onUploadClick={setUploadModalEventId} isPast={true} onPastEventClick={setModalGalleryEvent} onImageClick={(images, startIndex) => setLightbox({ images, startIndex })} />)}
                </div>
            ]}
        </Section>
        
        <Section id="cardapio" className="bg-black/20">
            <SectionTitle>Cardápio</SectionTitle>
            {menu.flatMap(category => [
                <h3 key={`${category.id}-h`} className="text-3xl font-display text-[var(--secondary-color)] mb-6 text-center mt-12">{category.name}</h3>,
                <div key={`${category.id}-c`} className="max-w-3xl mx-auto text-left">
                    <div className="space-y-4">
                        {category.items.map(item => (
                            <div key={item.id} className="border-b border-dashed border-white/20 pb-2 flex justify-between items-baseline">
                                <div>
                                    <p className="font-bold text-lg text-white">{item.name}</p>
                                    <p className="text-sm text-white/60">{item.description}</p>
                                </div>
                                <p className="font-bold text-lg text-[var(--primary-color)]">{item.price}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ])}
        </Section>

        <Section id="oraculo">
            <SectionTitle>Oráculo da Lary</SectionTitle>
            <div className="max-w-xl mx-auto bg-black/30 p-8 rounded-lg neon-border mt-12">
                <p className="mb-4 text-white/80">Como você está se sentindo hoje? Desabafe com o Oráculo e receba uma poção mágica (e um conselho) para sua noite.</p>
                <textarea value={oracleFeeling} onChange={e => setOracleFeeling(e.target.value)} placeholder="Ex: Cansada da vida, querendo um milagre..." rows={3} className="w-full p-2 bg-black/50 border border-white/20 rounded focus:outline-none focus:border-[var(--primary-color)] mb-4"></textarea>
                <button onClick={handleOracleQuery} disabled={isOracleLoading} className="w-full font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100">
                    {isOracleLoading ? 'Consultando os astros...' : 'Revelar meu Destino'}
                </button>
            </div>
            {oracleResult && (
                <div className="mt-12 max-w-2xl mx-auto text-left bg-black/20 p-8 rounded-lg border border-white/10 relative">
                    {oracleResult.error ? <p className="text-center text-red-400">{oracleResult.error}</p> : (
                        <>
                            <button onClick={() => setSharePotion(oracleResult)} className="absolute top-4 right-4 text-white/70 hover:text-[var(--primary-color)] transition-colors p-2" title="Compartilhar">
                                <ShareIcon className="w-6 h-6"/>
                            </button>

                            <h4 className="text-3xl font-display text-center text-[var(--secondary-color)] text-glow mb-4">{oracleResult.drinkName}</h4>
                            <p className="italic text-white/70 mb-4 text-center">"{oracleResult.story}"</p>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <p className="font-bold mb-2 text-[var(--primary-color)]">Ingredientes:</p>
                                    <ul className="list-disc list-inside text-white/80 space-y-1">
                                        {(oracleResult.ingredients || []).map((ing: string, i: number) => <li key={i}>{ing}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-bold mb-2 text-[var(--primary-color)]">Modo de Preparo:</p>
                                    <p className="text-white/80 whitespace-pre-line">{oracleResult.preparation}</p>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 mt-4">
                                <p className="font-bold mb-2 text-[var(--primary-color)]">Efeitos Colaterais:</p>
                                <ul className="list-disc list-inside text-white/80 space-y-1">
                                    {(oracleResult.sideEffects || []).map((effect: string, i: number) => <li key={i}>{effect}</li>)}
                                </ul>
                            </div>
                             <div className="border-t border-white/10 pt-4 mt-6">
                                <p className="font-bold mb-2 text-[var(--primary-color)]">Conselho do Oráculo:</p>
                                <p className="text-white/80">{oracleResult.advice}</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Section>
        
        <Section id="pocoes">
            <SectionTitle>Galeria de Poções</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                {oracleHistory.length > 0 ? oracleHistory.map((query, index) => (
                    <button key={index} onClick={() => setSelectedPotion(query)} className="bg-black/40 rounded-lg border border-white/10 overflow-hidden transition-all duration-300 hover:border-[var(--secondary-color)] hover:-translate-y-2 p-6 text-left flex flex-col">
                        <h4 className="text-lg font-display text-[var(--secondary-color)] mb-3">{query.result.drinkName}</h4>
                        <div className="space-y-3 text-sm flex-grow">
                            <div>
                                <p className="font-bold text-[var(--primary-color)] text-xs mb-1">INGREDIENTES:</p>
                                <p className="text-white/70 line-clamp-2">{(query.result.ingredients || []).join(', ')}</p>
                            </div>
                             <div>
                                <p className="font-bold text-[var(--primary-color)] text-xs mb-1">EFEITOS COLATERAIS:</p>
                                <p className="text-white/70 line-clamp-2">{(query.result.sideEffects || []).join(', ')}</p>
                            </div>
                        </div>
                         <span className="text-xs text-white/50 mt-4 self-start">{new Date(query.date).toLocaleDateString('pt-BR')}</span>
                    </button>
                )) : (
                    <p className="text-white/70 text-center col-span-full mt-12">Nenhuma poção foi criada ainda. Seja o primeiro a consultar o Oráculo!</p>
                )}
            </div>
        </Section>
        
        <Section id="fotos">
            <SectionTitle>Galeria de Fotos</SectionTitle>
            {approvedPhotos.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-12">
                    {approvedPhotos.map((photo, index) => {
                        const imageBase64 = adminService.getPhotoImage(photo.path);
                        if (!imageBase64) return null;
                        return (
                             <div key={photo.id} className="aspect-square cursor-pointer" onClick={() => openLightbox(approvedPhotos, photo.id)}>
                                <img src={`data:image/jpeg;base64,${imageBase64}`} alt={`Foto de ${photo.uploaderName}`} className="rounded-lg w-full h-full object-cover transition-transform hover:scale-105" />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-white/70 mt-12">Nenhuma foto ainda! Seja o primeiro a enviar uma foto de um de nossos eventos.</p>
            )}
        </Section>

      </main>

      <footer className="py-12 text-center text-white/50 border-t border-white/10 relative z-10 bg-[var(--background-color)]">
        <p className="font-logo text-2xl text-white/80 text-glow mb-2">Lary's House</p>
        <p>&copy; {new Date().getFullYear()} Todos os direitos reservados.</p>
        <div className="absolute bottom-2 right-2">
            <Link to="/admin" className="text-xs text-white/30 hover:text-[var(--primary-color)] transition-colors">Admin</Link>
        </div>
      </footer>
    </div>
  );
};

export default MainSite;