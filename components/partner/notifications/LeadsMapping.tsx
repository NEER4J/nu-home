'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Plus, X, Tag, Users, Settings, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface GHLField {
  id: string
  name: string
  fieldType: string
}

interface GHLPipeline {
  id: string
  name: string
  stages?: Array<{
    id: string
    name: string
  }>
}

interface TemplateField {
  field_name: string
  display_name: string
  description?: string
}

interface GHLMapping {
  mapping_id: string
  recipient_type: 'customer' | 'admin'
  pipeline_id: string | null
  opportunity_stage: string | null
  field_mappings: Record<string, string>
  tags: string[]
  is_active: boolean
  is_default: boolean
}

interface LeadsMappingProps {
  ghlIntegration: any
  ghlFieldMappings: GHLMapping[]
  ghlPipelines: GHLPipeline[]
  ghlCustomFields: GHLField[]
  templateFields: TemplateField[]
  ghlLoading: boolean
  ghlSaving: boolean
  onSaveMapping: (mapping: GHLMapping) => Promise<void>
  onRefresh: () => void
  onUpdateMapping: (mappingId: string, updates: Partial<GHLMapping>) => void
}

export default function LeadsMapping({
  ghlIntegration,
  ghlFieldMappings,
  ghlPipelines,
  ghlCustomFields,
  templateFields,
  ghlLoading,
  ghlSaving,
  onSaveMapping,
  onRefresh,
  onUpdateMapping
}: LeadsMappingProps) {
  const [activeMapping, setActiveMapping] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pipeline: true,
    tags: true,
    fields: true
  })

  const addTag = (mappingId: string, tag: string) => {
    if (!tag.trim()) return
    const mapping = ghlFieldMappings.find(m => m.mapping_id === mappingId)
    if (!mapping) return
    
    const currentTags = Array.isArray(mapping.tags) ? mapping.tags : []
    if (!currentTags.includes(tag)) {
      onUpdateMapping(mappingId, { tags: [...currentTags, tag] })
    }
  }

  const removeTag = (mappingId: string, tagIndex: number) => {
    const mapping = ghlFieldMappings.find(m => m.mapping_id === mappingId)
    if (!mapping) return
    
    const currentTags = Array.isArray(mapping.tags) ? mapping.tags : []
    const updatedTags = currentTags.filter((_, index) => index !== tagIndex)
    onUpdateMapping(mappingId, { tags: updatedTags })
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getPipelineName = (pipelineId: string | null) => {
    if (!pipelineId) return 'No pipeline selected'
    return ghlPipelines.find(p => p.id === pipelineId)?.name || 'Unknown pipeline'
  }

  const getStageName = (pipelineId: string | null, stageId: string | null) => {
    if (!pipelineId || !stageId) return 'No stage selected'
    const pipeline = ghlPipelines.find(p => p.id === pipelineId)
    return pipeline?.stages?.find(s => s.id === stageId)?.name || 'Unknown stage'
  }

  const getFieldMappingCount = (mapping: GHLMapping) => {
    return Object.values(mapping.field_mappings).filter(value => value).length
  }

  return (
    <div className="space-y-6">
     
      {/* Mapping Cards - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ghlFieldMappings.map((mapping) => (
        <div 
          key={mapping.mapping_id} 
          className="bg-white rounded-xl border border-gray-200 shadow-sm"
        >
          {/* Card Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  mapping.recipient_type === 'customer' 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mapping.recipient_type === 'customer' ? 'Customer Lead' : 'Admin Lead'} Mapping
                  </h3>
                  <p className="text-sm text-gray-500">
                    Configure how {mapping.recipient_type} leads are processed
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onSaveMapping(mapping)}
                disabled={ghlSaving}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {ghlSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Mapping
              </Button>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-6 space-y-6">
            {/* Pipeline & Stage Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Pipeline Configuration</span>
                  <div className="flex items-center space-x-1">
                    {mapping.pipeline_id && mapping.opportunity_stage ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-600 font-medium">Configured</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-xs text-amber-600 font-medium">Incomplete</span>
                      </>
                    )}
                  </div>
                </h4>
                <button
                  onClick={() => toggleSection('pipeline')}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-full p-1"
                >
                  <div className={`transform transition-transform duration-200 ${expandedSections.pipeline ? 'rotate-0' : 'rotate-90'}`}>
                    {expandedSections.pipeline ? '−' : '+'}
                  </div>
                </button>
              </div>
              
              {expandedSections.pipeline && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pipeline Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pipeline
                    </label>
                    <div className="relative">
                      <select
                        value={mapping.pipeline_id || ''}
                        onChange={(e) => {
                          const pipelineId = e.target.value
                          onUpdateMapping(mapping.mapping_id, { 
                            pipeline_id: pipelineId, 
                            opportunity_stage: '' 
                          })
                        }}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
                      >
                        <option value="">Select a pipeline</option>
                        {ghlPipelines.map((pipeline) => (
                          <option key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Choose the pipeline where new opportunities will be created
                    </p>
                  </div>

                  {/* Stage Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Initial Stage
                    </label>
                    <div className="relative">
                      <select
                        value={mapping.opportunity_stage || ''}
                        onChange={(e) => {
                          onUpdateMapping(mapping.mapping_id, { 
                            opportunity_stage: e.target.value 
                          })
                        }}
                        disabled={!mapping.pipeline_id}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-white appearance-none cursor-pointer"
                      >
                        <option value="">
                          {!mapping.pipeline_id ? 'Select a pipeline first' : 'Select initial stage'}
                        </option>
                        {mapping.pipeline_id && ghlPipelines
                          .find(pipeline => pipeline.id === mapping.pipeline_id)
                          ?.stages?.map((stage) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      The stage where new opportunities will be placed initially
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tags Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>Contact Tags</span>
                  <div className="flex items-center space-x-1">
                    {Array.isArray(mapping.tags) && mapping.tags.length > 0 ? (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-blue-600 font-medium">
                          {mapping.tags.length} tag{mapping.tags.length !== 1 ? 's' : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-xs text-gray-500 font-medium">No tags</span>
                      </>
                    )}
                  </div>
                </h4>
                <button
                  onClick={() => toggleSection('tags')}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-full p-1"
                >
                  <div className={`transform transition-transform duration-200 ${expandedSections.tags ? 'rotate-0' : 'rotate-90'}`}>
                    {expandedSections.tags ? '−' : '+'}
                  </div>
                </button>
              </div>
              
              {expandedSections.tags && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[60px]">
                    {Array.isArray(mapping.tags) && mapping.tags.length > 0 ? (
                      <>
                        {mapping.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors"
                          >
                            {tag}
                            <button
                              onClick={() => removeTag(mapping.mapping_id, tagIndex)}
                              className="ml-2 hover:bg-blue-300 rounded-full p-0.5 transition-colors"
                              title="Remove tag"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => onUpdateMapping(mapping.mapping_id, { tags: [] })}
                          className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors ml-2"
                        >
                          Clear All
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">No tags added yet</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(mapping.mapping_id, newTag)
                          setNewTag('')
                        }
                      }}
                      placeholder="Type tag and press Enter"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button
                      onClick={() => {
                        addTag(mapping.mapping_id, newTag)
                        setNewTag('')
                      }}
                      disabled={!newTag.trim()}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Press Enter to add tags. These will be applied to {mapping.recipient_type} leads in GoHighLevel.
                  </p>
                </div>
              )}
            </div>

            {/* Field Mappings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Field Mappings</span>
                  
                </h4>
                <button
                  onClick={() => toggleSection('fields')}
                  className="text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-full p-1"
                >
                  <div className={`transform transition-transform duration-200 ${expandedSections.fields ? 'rotate-0' : 'rotate-90'}`}>
                    {expandedSections.fields ? '−' : '+'}
                  </div>
                </button>
              </div>
              
              {expandedSections.fields && (
                <div className="space-y-3">
                  {templateFields.map((field, index) => (
                    <div key={field.field_name || index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                       <div className="flex-1">
                         <label className="block text-sm font-medium text-gray-900">
                           {field.display_name}
                         </label>
                       </div>
                      <div className="flex-1">
                        <div className="relative">
                          <select
                            value={mapping.field_mappings[field.field_name] || ''}
                            onChange={(e) => {
                              const updatedFieldMappings = {
                                ...mapping.field_mappings,
                                [field.field_name]: e.target.value
                              }
                              onUpdateMapping(mapping.mapping_id, { 
                                field_mappings: updatedFieldMappings 
                              })
                            }}
                            className="block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
                          >
                            <option value="">Select GHL field</option>
                            {ghlCustomFields.map((ghlField) => (
                              <option key={ghlField.id} value={ghlField.id}>
                                {ghlField.name} ({ghlField.fieldType})
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
         </div>
       ))}
      </div>
 
       {/* Empty State */}
      {ghlFieldMappings.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Field Mappings</h3>
          <p className="text-sm text-gray-500">
            Field mappings will be created automatically when you select a category and email type.
          </p>
        </div>
      )}
    </div>
  )
}
