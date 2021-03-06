// Copyright 2017 Kensho Technologies, Inc.

import _ from 'lodash'

import {getMaxY} from '../../utils/rectUtils'
import {getPath2D} from '../../utils/path2DUtils'
import {getPlotValues} from '../../Layer/getPlotValues'
import {isPlotNumber} from '../../utils'
import {notPlotNumber} from '../../utils'
import {plotValue} from '../../Layer/plotValue'

export const getPointData = (props, datum, yKey) => {
  const path2D = getPath2D()
  const x = plotValue(
    props, datum, undefined, 'x'
  )
  const y = plotValue(
    props, datum, undefined, yKey
  )
  const r = plotValue(props, datum, undefined, 'strokeWidth', 2) + 1.5
  if (notPlotNumber([x, y, r])) return undefined
  path2D.arc(x, y, r, 0, 2 * Math.PI)
  return {
    hoverAlpha: 0.8,
    path2D,
    type: 'area',
  }
}

const getHoverSolverObj = (props, renderDatum, hoverData) => ({
  hoverRenderData: [
    renderDatum,
    getPointData(props, hoverData, 'y'),
    getPointData(props, hoverData, 'y0'),
  ],
  hoverData,
})

export const hoverSolver = (
  props, _hoverData, renderDatum, localMouse
) => {
  const xRaw = props.xScale.invert(localMouse.x)
  if (props.xType === 'ordinal') {
    const hoverData = _.find(_hoverData, d => _.get(d, props.x) === xRaw)
    return getHoverSolverObj(props, renderDatum, hoverData)
  }
  const hoverIndex = _.findIndex(_hoverData, d => _.get(d, props.x) > xRaw)
  if (hoverIndex === 0) {
    const hoverData = _hoverData[hoverIndex]
    return getHoverSolverObj(props, renderDatum, hoverData)
  }
  if (hoverIndex === -1) {
    const hoverData = _.last(_hoverData)
    return getHoverSolverObj(props, renderDatum, hoverData)
  }
  const px = _.get(_hoverData[hoverIndex], props.x)
  const x = _.get(_hoverData[hoverIndex - 1], props.x)
  if (xRaw - px < x - xRaw) {
    const hoverData = _hoverData[hoverIndex - 1]
    return getHoverSolverObj(props, renderDatum, hoverData)
  }
  const hoverData = _hoverData[hoverIndex]
  return getHoverSolverObj(props, renderDatum, hoverData)
}

export const getAreaRenderData = (props, data, idx) => {
  if (_.isEmpty(data)) return {showHover: false}
  const path2D = getPath2D()
  path2D.moveTo(
    plotValue(props, _.head(data), idx, 'x', 0),
    plotValue(props, _.head(data), idx, 'y', 0)
  )
  _.each(data, d => {
    const x = plotValue(props, d, idx, 'x')
    const y = plotValue(props, d, idx, 'y')
    if (notPlotNumber([x, y])) return
    path2D.lineTo(x, y)
  })
  const y0 = plotValue(props, _.head(data), idx, 'y0')
  const x0 = plotValue(props, _.head(data), idx, 'x0')
  // if there's no base position accessors
  if (notPlotNumber(y0) && notPlotNumber(x0)) {
    const localY0 = props.yScale(0) || getMaxY(props.plotRect)
    path2D.lineTo(
      plotValue(props, _.last(data), idx, 'x', 0),
      localY0,
    )
    path2D.lineTo(
      plotValue(props, _.head(data), idx, 'x', 0),
      localY0,
    )
  // if the base is on the y axis
  } else if (isPlotNumber(y0) && notPlotNumber(x0)) {
    _.eachRight(data, d => {
      const x = plotValue(props, d, idx, 'x')
      const localY0 = plotValue(props, d, idx, 'y0')
      if (notPlotNumber([x, localY0])) return
      path2D.lineTo(x, localY0)
    })
  // if the base is on the x axis
  } else if (notPlotNumber(y0) && isPlotNumber(x0)) {
    _.eachRight(data, d => {
      const localX0 = plotValue(props, d, idx, 'x0')
      const y = plotValue(props, d, idx, 'y')
      if (notPlotNumber([localX0, y])) return
      path2D.lineTo(localX0, y)
    })
  }
  path2D.closePath()

  const values = getPlotValues(props, _.head(data), idx, {
    hoverAlpha: 0.25,
  })
  return {
    ...values,
    data,
    hoverSolver,
    path2D,
    type: 'area',
  }
}
export const areas = props => {
  if (!props.xScale || !props.yScale) return undefined
  if (_.isArray(_.head(props.data))) {
    return _.reduce(
      props.data,
      (acc, data, idx) => acc.concat(getAreaRenderData(props, data, idx)),
      []
    )
  }
  return [getAreaRenderData(props, props.data)]
}
