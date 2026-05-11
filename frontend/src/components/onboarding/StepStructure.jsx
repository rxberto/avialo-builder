import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Plus, X, Lock, LayoutTemplate, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COMMON_PAGES = ['Sobre nosotros', 'Servicios', 'Galería', 'Blog', 'FAQ', 'Contacto'];
const COMMON_SECTIONS = ['Hero (Principal)', 'Características', 'Beneficios', 'Testimonios', 'FAQ', 'Formulario', 'Call to Action', 'Equipo', 'Galería', 'Precios'];

const REQUIRED_PAGES = ['Inicio'];
const REQUIRED_SECTIONS = ['Hero (Principal)'];

export default function StepStructure({ datos = {}, updateData }) {
  const [activeTab, setActiveTab] = useState('pages');
  const [customInput, setCustomInput] = useState('');

  // Defensive extraction of list states
  const dPages = datos.pages || [];
  const dHomeSections = datos.homeSections || [];

  const availablePages = COMMON_PAGES.filter(p => !dPages.includes(p) && !REQUIRED_PAGES.includes(p));
  
  const addPage = (name) => {
    const trimmed = name.trim();
    if (trimmed && !dPages.includes(trimmed)) {
      updateData('pages', [...dPages, trimmed]);
    }
    setCustomInput('');
  };
  const removePage = (name) => {
    if (REQUIRED_PAGES.includes(name)) return;
    updateData('pages', dPages.filter(p => p !== name));
  };
  const handleDragEndPages = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const next = Array.from(dPages);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    updateData('pages', next);
  };

  const availableSections = COMMON_SECTIONS.filter(s => !dHomeSections.includes(s) && !REQUIRED_SECTIONS.includes(s));
  
  const addSection = (name) => {
    const trimmed = name.trim();
    if (trimmed && !dHomeSections.includes(trimmed)) {
      updateData('homeSections', [...dHomeSections, trimmed]);
    }
    setCustomInput('');
  };
  const removeSection = (name) => {
    if (REQUIRED_SECTIONS.includes(name)) return;
    updateData('homeSections', dHomeSections.filter(s => s !== name));
  };
  const handleDragEndSections = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const next = Array.from(dHomeSections);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    updateData('homeSections', next);
  };

  const activeItems = activeTab === 'pages' ? dPages : dHomeSections;
  const availableItems = activeTab === 'pages' ? availablePages : availableSections;
  const requiredItems = activeTab === 'pages' ? REQUIRED_PAGES : REQUIRED_SECTIONS;
  const handleDragEnd = activeTab === 'pages' ? handleDragEndPages : handleDragEndSections;
  const addItem = activeTab === 'pages' ? addPage : addSection;
  const removeItem = activeTab === 'pages' ? removePage : removeSection;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Mapa del Sitio</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-2xl">
          Organiza las páginas de navegación y las secciones visibles en la página de inicio.
        </p>
      </div>

      <div className="w-full flex justify-center md:justify-start">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
          <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
            <TabsTrigger value="pages" className="rounded-lg gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <LayoutTemplate size={15} />
              Menú Web
            </TabsTrigger>
            <TabsTrigger value="sections" className="rounded-lg gap-2 data-[state=active]:shadow-sm data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
              <Layers size={15} />
              Portada
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Main Structure List */}
        <Card className="md:col-span-7 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {activeTab === 'pages' ? 'Navegación Principal' : 'Módulos Portada'}
              </CardTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Arrastra para reordenar</p>
            </div>
            <Badge variant="secondary" className="rounded-full font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {activeItems.length} total
            </Badge>
          </CardHeader>
          <CardContent className="pt-5">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="dnd-list" renderClone={(provided, snapshot, rubric) => {
                const item = activeItems[rubric.source.index];
                return (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-900 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 shadow-xl ring-4 ring-zinc-900/10 opacity-90 select-none"
                  >
                    <GripVertical size={16} />
                    <span className="font-medium text-sm">{item}</span>
                  </div>
                );
              }}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 min-h-[150px]">
                    {activeItems.map((item, index) => {
                      const isRequired = requiredItems.includes(item);
                      return (
                        <Draggable key={item} draggableId={item} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{ ...provided.draggableProps.style }}
                              className={cn(
                                "group flex items-center justify-between p-3 rounded-xl border transition-all select-none",
                                snapshot.isDragging 
                                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg z-50" 
                                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-600",
                                isRequired && "border-dashed bg-zinc-50/50 dark:bg-zinc-900/30 opacity-70"
                              )}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "flex items-center justify-center h-8 w-8 rounded-lg transition-colors cursor-grab active:cursor-grabbing",
                                    snapshot.isDragging ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                                  )}
                                >
                                  {isRequired ? <Lock size={14} /> : <GripVertical size={16} />}
                                </div>
                                <span className="font-medium text-sm">{item}</span>
                              </div>
                              {!isRequired && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => removeItem(item)}
                                  className={cn(
                                    "h-8 w-8 text-zinc-400 hover:text-destructive transition-opacity",
                                    snapshot.isDragging ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                                  )}
                                >
                                  <X size={14} />
                                </Button>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </CardContent>
        </Card>

        {/* Right Column: Add Elements */}
        <div className="md:col-span-5 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sugerencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {availableItems.map(item => (
                  <Button
                    key={item}
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(item)}
                    className="h-9 px-3 rounded-lg text-xs font-medium border-zinc-200 dark:border-zinc-700 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-900 gap-1.5 transition-all bg-white dark:bg-zinc-950"
                  >
                    <Plus size={13} strokeWidth={3} />
                    {item}
                  </Button>
                ))}
                {availableItems.length === 0 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">No hay más sugerencias disponibles.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Añadir propio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={activeTab === 'pages' ? "Ej: Trabaja con nosotros" : "Ej: Galería de proyectos"}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem(customInput)}
                  className="h-10 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                />
                <Button
                  onClick={() => addItem(customInput)}
                  disabled={!customInput.trim()}
                  className="h-10 px-4 font-medium"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </motion.div>
  );
}
