import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { getGraphData, getStands, getFlights } from '../../api'
import { useFetch } from '../../hooks/useFetch'
import { LoadingScreen, EmptyState, ErrorBanner } from '../ui'
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export default function AirportResourceGraph() {
  const svgRef = useRef()
  const [graphData, setGraphData] = useState(null)
  const [stands, setStands] = useState([])
  const [flights, setFlights] = useState([])
  const [gateNodes, setGateNodes] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [layers, setLayers] = useState({
    stands: true,
    gates: true,
    plbConnections: true,
    walkingConnections: true,
    adjacencyConstraints: true
  })
  const [zoom, setZoom] = useState(1)
  const [transform, setTransform] = useState({ x: 0, y: 0 })

  const flightsFetcher = useCallback(() => getFlights({ per_page: 50 }), [])
  const { data: flightData, loading, error } = useFetch(flightsFetcher, [])

  useEffect(() => {
    Promise.all([
      getGraphData(),
      getStands()
    ]).then(([graphResp, standsResp]) => {
      setGraphData(graphResp)
      setStands(standsResp)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (flightData?.data) {
      setFlights(flightData.data)
    }
  }, [flightData])

  const getCurrentlyOccupiedStands = useCallback(() => {
    const now = new Date()
    const occupied = new Set()
    
    flights.forEach(flight => {
      const start = new Date(flight.block_time_start)
      const end = new Date(flight.block_time_end)
      if (start <= now && now <= end) {
        occupied.add(flight.assigned_stand)
      }
    })
    
    return occupied
  }, [flights])

  const renderGraph = useCallback(() => {
    if (!graphData || !stands.length || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const width = 800
    const height = 600
    const occupiedStands = getCurrentlyOccupiedStands()

    svg.attr("width", width).attr("height", height)

    const g = svg.append("g")
      .attr("transform", `translate(${transform.x}, ${transform.y}) scale(${zoom})`)

    // Create nodes - stands and gates
    const standNodes = stands.map(stand => ({
      id: stand.id,
      type: 'stand',
      ...stand,
      x: stand.position.x * 2 + 50, // Scale up positions
      y: stand.position.y * 1.5 + 50,
      occupied: occupiedStands.has(stand.id)
    }))

    // Create gate nodes based on graph connections
    const gateNodesLocal = []
    const gatePositions = {}
    
    // Calculate gate positions near their connected stands
    if (graphData.plb_connections) {
      graphData.plb_connections.forEach(conn => {
        if (!gatePositions[conn.gate]) {
          const stand = standNodes.find(s => s.id === conn.stand)
          if (stand) {
            gatePositions[conn.gate] = {
              x: stand.x + (stand.terminal === 'T1' ? -40 : 40),
              y: stand.y - 30
            }
          }
        }
      })
    }

    Object.entries(gatePositions).forEach(([gateId, pos]) => {
      gateNodesLocal.push({
        id: gateId,
        type: 'gate',
        terminal: gateId.startsWith('G0') && parseInt(gateId.slice(2)) <= 4 ? 'T1' : 'T2',
        ...pos
      })
    })

    // Update state with gate nodes for UI display
    setGateNodes(gateNodesLocal)

    const allNodes = [...standNodes, ...gateNodesLocal]

    // Terminal colors
    const terminalColors = {
      T1: '#3b82f6',
      T2: '#f59e0b',
      T3: '#10b981'
    }

    // Draw connections
    if (layers.adjacencyConstraints && graphData.adjacency_constraints) {
      const constraintLines = g.append("g").attr("class", "constraint-lines")
      
      graphData.adjacency_constraints.forEach(constraint => {
        const standA = standNodes.find(s => s.id === constraint.stand_a)
        const standB = standNodes.find(s => s.id === constraint.stand_b)
        
        if (standA && standB) {
          constraintLines.append("line")
            .attr("x1", standA.x)
            .attr("y1", standA.y)
            .attr("x2", standB.x)
            .attr("y2", standB.y)
            .attr("stroke", "#ef4444")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.7)
        }
      })
    }

    if (layers.plbConnections && graphData.plb_connections) {
      const plbLines = g.append("g").attr("class", "plb-lines")
      
      graphData.plb_connections.forEach(conn => {
        const stand = standNodes.find(s => s.id === conn.stand)
        const gate = gateNodesLocal.find(g => g.id === conn.gate)
        
        if (stand && gate) {
          plbLines.append("line")
            .attr("x1", stand.x)
            .attr("y1", stand.y)
            .attr("x2", gate.x)
            .attr("y2", gate.y)
            .attr("stroke", "#6366f1")
            .attr("stroke-width", 3)
            .attr("opacity", 0.8)
        }
      })
    }

    if (layers.walkingConnections && graphData.walking_connections) {
      const walkingLines = g.append("g").attr("class", "walking-lines")
      
      graphData.walking_connections.forEach(conn => {
        const stand = standNodes.find(s => s.id === conn.stand)
        const gate = gateNodesLocal.find(g => g.id === conn.gate)
        
        if (stand && gate) {
          walkingLines.append("line")
            .attr("x1", stand.x)
            .attr("y1", stand.y)
            .attr("x2", gate.x)
            .attr("y2", gate.y)
            .attr("stroke", conn.type === 'bus' ? "#f59e0b" : "#10b981")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "8,4")
            .attr("opacity", 0.6)
        }
      })
    }

    // Draw nodes
    if (layers.stands) {
      const standGroups = g.append("g").attr("class", "stands")
        .selectAll(".stand")
        .data(standNodes)
        .enter()
        .append("g")
        .attr("class", "stand")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => setSelectedNode(d))

      standGroups.append("rect")
        .attr("x", -20)
        .attr("y", -15)
        .attr("width", 40)
        .attr("height", 30)
        .attr("rx", 4)
        .attr("fill", d => d.occupied ? "#ef4444" : terminalColors[d.terminal])
        .attr("fill-opacity", d => d.occupied ? 0.8 : 0.3)
        .attr("stroke", d => terminalColors[d.terminal])
        .attr("stroke-width", 2)
        .attr("filter", d => d.occupied ? "drop-shadow(0 0 8px #ef4444)" : "none")

      standGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 5)
        .attr("font-size", "10px")
        .attr("font-family", "JetBrains Mono")
        .attr("font-weight", "600")
        .attr("fill", d => terminalColors[d.terminal])
        .text(d => d.id)

      // Occupancy indicator
      standGroups.filter(d => d.occupied)
        .append("circle")
        .attr("cx", 15)
        .attr("cy", -10)
        .attr("r", 3)
        .attr("fill", "#ef4444")
        .append("title")
        .text("Currently Occupied")
    }

    if (layers.gates) {
      const gateGroups = g.append("g").attr("class", "gates")
        .selectAll(".gate")
        .data(gateNodesLocal)
        .enter()
        .append("g")
        .attr("class", "gate")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)
        .style("cursor", "pointer")
        .on("click", (event, d) => setSelectedNode(d))

      gateGroups.append("circle")
        .attr("r", 15)
        .attr("fill", d => terminalColors[d.terminal])
        .attr("fill-opacity", 0.4)
        .attr("stroke", d => terminalColors[d.terminal])
        .attr("stroke-width", 2)

      gateGroups.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 4)
        .attr("font-size", "9px")
        .attr("font-family", "JetBrains Mono")
        .attr("font-weight", "600")
        .attr("fill", d => terminalColors[d.terminal])
        .text(d => d.id)
    }

    // Add zoom and pan behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        const { transform } = event
        g.attr("transform", transform)
        setZoom(transform.k)
        setTransform({ x: transform.x, y: transform.y })
      })

    svg.call(zoomBehavior)

  }, [graphData, stands, flights, layers, zoom, transform, getCurrentlyOccupiedStands])

  useEffect(() => {
    renderGraph()
  }, [renderGraph])

  const toggleLayer = (layer) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }))
  }

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom().transform,
      d3.zoomIdentity.scale(zoom * 1.5)
    )
  }

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom().transform,
      d3.zoomIdentity.scale(zoom * 0.7)
    )
  }

  const handleReset = () => {
    const svg = d3.select(svgRef.current)
    svg.transition().call(
      d3.zoom().transform,
      d3.zoomIdentity
    )
  }

  if (loading) {
    return <LoadingScreen label="LOADING AIRPORT RESOURCE GRAPH…" />
  }

  if (error) {
    return <ErrorBanner error={error} />
  }

  if (!graphData || !stands.length) {
    return <EmptyState icon="🗺" title="No graph data" subtitle="Unable to load airport resources" />
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Main Graph Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid var(--border)', 
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontSize: '18px', 
              color: 'var(--text)', 
              fontFamily: 'Syne',
              fontWeight: '600'
            }}>Airport Resource Graph</h1>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '12px', 
              color: 'var(--text-muted)',
              fontFamily: 'JetBrains Mono'
            }}>
              {stands.length} stands • {gateNodes?.length || 0} gates • Real-time occupancy
            </p>
          </div>
          
          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleZoomOut} style={{
              padding: '6px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <ZoomOut size={14} />
            </button>
            <button onClick={handleReset} style={{
              padding: '6px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <RotateCcw size={14} />
            </button>
            <button onClick={handleZoomIn} style={{
              padding: '6px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Graph Canvas */}
        <div style={{ 
          flex: 1, 
          background: 'var(--bg-base)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <svg ref={svgRef} style={{ border: '1px solid var(--border)', borderRadius: '8px' }} />
        </div>
      </div>

      {/* Sidebar Controls */}
      <div style={{ 
        width: '280px', 
        background: 'var(--bg-surface)', 
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Layer Controls */}
        <div style={{ padding: '16px' }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            color: 'var(--text)',
            fontWeight: '600'
          }}>Layers</h3>
          
          {[
            { key: 'stands', label: 'Stands', color: '#3b82f6' },
            { key: 'gates', label: 'Gates', color: '#10b981' },
            { key: 'plbConnections', label: 'PLB Connections', color: '#6366f1' },
            { key: 'walkingConnections', label: 'Walking/Bus', color: '#f59e0b' },
            { key: 'adjacencyConstraints', label: 'Constraints', color: '#ef4444' }
          ].map(({ key, label, color }) => (
            <div key={key} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '6px 0',
              cursor: 'pointer'
            }} onClick={() => toggleLayer(key)}>
              <button style={{
                background: 'none',
                border: 'none',
                color: layers[key] ? color : 'var(--text-muted)',
                cursor: 'pointer'
              }}>
                {layers[key] ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <span style={{ 
                fontSize: '12px', 
                color: layers[key] ? 'var(--text)' : 'var(--text-muted)',
                fontFamily: 'JetBrains Mono'
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ padding: '0 16px 16px' }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px', 
            color: 'var(--text)',
            fontWeight: '600'
          }}>Legend</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 12, background: '#3b82f6', opacity: 0.3, border: '1px solid #3b82f6' }} />
              <span style={{ color: 'var(--text-muted)' }}>T1 Stand</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 12, background: '#f59e0b', opacity: 0.3, border: '1px solid #f59e0b' }} />
              <span style={{ color: 'var(--text-muted)' }}>T2 Stand</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: '50%' }} />
              <span style={{ color: 'var(--text-muted)' }}>Occupied</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 2, background: '#6366f1' }} />
              <span style={{ color: 'var(--text-muted)' }}>PLB Connection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 2, background: '#ef4444', opacity: 0.7 }} />
              <span style={{ color: 'var(--text-muted)' }}>Constraint</span>
            </div>
          </div>
        </div>

        {/* Node Details */}
        {selectedNode && (
          <div style={{ 
            padding: '16px', 
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-raised)'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '14px', 
              color: 'var(--text)',
              fontWeight: '600'
            }}>
              {selectedNode.type === 'stand' ? 'Stand' : 'Gate'} Details
            </h3>
            
            <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>ID: </span>
                <span style={{ color: 'var(--text)' }}>{selectedNode.id}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Terminal: </span>
                <span style={{ color: 'var(--text)' }}>{selectedNode.terminal}</span>
              </div>
              {selectedNode.type === 'stand' && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Type: </span>
                    <span style={{ color: 'var(--text)' }}>{selectedNode.type_details || selectedNode.type}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Max Size: </span>
                    <span style={{ color: 'var(--text)' }}>{selectedNode.max_aircraft_size}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>PLB: </span>
                    <span style={{ color: selectedNode.has_plb ? 'var(--green)' : 'var(--text-muted)' }}>
                      {selectedNode.has_plb ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                    <span style={{ color: selectedNode.occupied ? 'var(--rose)' : 'var(--green)' }}>
                      {selectedNode.occupied ? 'Occupied' : 'Available'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '11px',
                width: '100%'
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}